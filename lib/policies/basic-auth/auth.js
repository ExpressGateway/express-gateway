'use strict';

const passport = require('passport');
const BasicStrategy = require('passport-http').BasicStrategy;
let services = require('../../services/index');
let authService = services.auth;

passport.use(new BasicStrategy({ passReqToCallback: true }, authenticateBasic));

function authenticateBasic (req, clientId, clientSecret, done) {
  let credentialType, endpointScopes, requestedScopes;

  if (req.egContext && req.egContext.apiEndpoint && req.egContext.apiEndpoint.scopes) {
    endpointScopes = req.egContext.apiEndpoint.scopes && req.egContext.apiEndpoint.scopes.map(s => s.scope || s);
    credentialType = 'basic-auth';
  } else {
    credentialType = 'oauth';
    if (req.query.scope) {
      requestedScopes = req.query.scope.split(' ');
    } else if (req.body.scope) {
      requestedScopes = req.body.scope.split(' ');
    }
  }

  return authService.authenticateCredential(clientId, clientSecret, credentialType)
    .then(consumer => {
      if (!consumer) {
        return done(null, false);
      }

      return authService.authorizeCredential(clientId, credentialType, endpointScopes || requestedScopes)
        .then(authorized => {
          if (!authorized) {
            return done(null, false);
          }

          consumer.authorizedScopes = endpointScopes;

          return done(null, consumer);
        });
    })
    .catch(err => done(err));
}

module.exports = function () {
  return passport.authenticate('basic', { session: false });
};
