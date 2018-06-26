'use strict';
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
const BearerStrategy = require('passport-http-bearer').Strategy;

const config = require('../../config');
const jwtPolicy = require('../jwt/jwt');
const services = require('../../services/index');
const authService = services.auth;

passport.use(new LocalStrategy({ passReqToCallback: true }, authenticateLocal));
passport.use(new ClientPasswordStrategy({ passReqToCallback: true }, authenticateBasic));
passport.use(new BearerStrategy({ passReqToCallback: true }, authenticateToken));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  return authService.validateConsumer(id)
    .then(consumer => {
      if (!consumer) return done(null, false);
      return done(null, consumer);
    })
    .catch(err => done(err));
});

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
