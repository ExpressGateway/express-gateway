'use strict';
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
const BearerStrategy = require('passport-http-bearer').Strategy;

const config = require('../../config');
const jwtPolicy = require('../jwt').policy;
const services = require('../../services/index');
const authService = services.auth;

/**
 * LocalStrategy
 *
 * This strategy is used to authenticate users based on a username and password.
 * Anytime a request is made to authorize an application, we must ensure that
 * a user is logged in before asking them to approve the request.
 */

passport.use(new LocalStrategy({ passReqToCallback: true }, authenticateLocal));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  return authService.validateConsumer(id)
    .then(consumer => {
      if (!consumer) return done(null, false);
      return done(null, consumer);
    })
    .catch(err => done(err));
});

/**
 * BasicStrategy & ClientPasswordStrategy
 *
 * These strategies are used to authenticate registered OAuth clients. They are
 * employed to protect the `token` endpoint, which consumers use to obtain
 * access tokens. The OAuth 2.0 specification suggests that clients use the
 * HTTP Basic scheme to authenticate. Use of the client password strategy
 * allows clients to send the same credentials in the request body (as opposed
 * to the `Authorization` header). While this approach is not recommended by
 * the specification, in practice it is quite common.
 */

passport.use(new ClientPasswordStrategy({ passReqToCallback: true }, authenticateBasic));

/**
 * BearerStrategy
 *
 * This strategy is used to authenticate either users or clients based on an access token
 * (aka a bearer token). If a user, they must have previously authorized a client
 * application, which is issued an access token to make requests on behalf of
 * the authorizing user.
 */

passport.use(new BearerStrategy({ passReqToCallback: true }, authenticateToken));

function authenticateToken (req, accessToken, done) {
  let endpointScopes;
  if (req.egContext.apiEndpoint && req.egContext.apiEndpoint.scopes) {
    endpointScopes = req.egContext.apiEndpoint.scopes;
  }

  let token, consumer;

  return authService.authenticateToken(accessToken)
    .then(res => {
      if (!res) {
        return done(null, false);
      }

      token = res.token;
      consumer = res.consumer;

      return authService.authorizeToken(accessToken, 'oauth2', endpointScopes)
        .then(authorized => {
          if (!authorized) {
            return done(null, false);
          }
          delete req.headers.authorization;
          delete token.tokenDecrypted;
          consumer.token = token;

          if (!token.authenticatedUserId) {
            return done(null, consumer);
          }

          return authService.validateConsumer(token.authenticatedUserId)
            .then(user => {
              if (!user) {
                return done(null, false);
              }
              consumer.token = token;
              return done(null, consumer);
            });
        });
    });
}

function authenticateBasic (req, clientId, clientSecret, done) {
  let requestedScopes;

  if (req.query.scope) {
    requestedScopes = req.query.scope.split(' ');
  } else if (req.body.scope) {
    requestedScopes = req.body.scope.split(' ');
  }

  return authService.authenticateCredential(clientId, clientSecret, 'oauth2')
    .then(consumer => {
      if (!consumer) {
        return done(null, false);
      }

      return authService.authorizeCredential(clientId, 'oauth2', requestedScopes)
        .then(authorized => {
          if (!authorized) {
            return done(null, false);
          }

          consumer.authorizedScopes = requestedScopes;

          return done(null, consumer);
        });
    })
    .catch(done);
}

function authenticateLocal (req, clientId, clientSecret, done) {
  const credentialType = 'basic-auth';

  return authService.authenticateCredential(clientId, clientSecret, credentialType)
    .then(consumer => {
      if (!consumer) {
        return done(null, false);
      }

      return authService.authorizeCredential(clientId, credentialType)
        .then(authorized => {
          if (!authorized) {
            return done(null, false);
          }

          delete req.headers['authorization'];
          return done(null, consumer);
        });
    })
    .catch(err => done(err));
}

module.exports = function (actionParams) {
  if (config.systemConfig.accessTokens.tokenType === 'jwt') {
    const params = Object.assign({ getCommonAuthCallback: actionParams.getCommonAuthCallback }, actionParams.jwt);
    return jwtPolicy(params);
  }

  return function (req, res, next) {
    actionParams.session = false;
    passport.authenticate('bearer', actionParams, actionParams.getCommonAuthCallback(req, res, next))(req, res, next);
  };
};
