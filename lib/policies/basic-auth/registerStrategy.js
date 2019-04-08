const passport = require('passport');
const BasicStrategy = require('passport-http').BasicStrategy;
const services = require('../../services/index');
const authService = services.auth;

module.exports = function registerBasicStrategy() {
  passport.use(new BasicStrategy({ passReqToCallback: true }, authenticateBasic));

  function authenticateBasic(req, clientId, clientSecret, done) {
    let credentialType, endpointScopes, requestedScopes;

    if (req.egContext && req.egContext.apiEndpoint && req.egContext.apiEndpoint.scopes) {
      endpointScopes = req.egContext.apiEndpoint.scopes && req.egContext.apiEndpoint.scopes.map(s => s.scope || s);
      credentialType = 'basic-auth';
    } else {
      credentialType = 'oauth2';
      if (req.query && req.query.scope) {
        requestedScopes = req.query.scope.split(' ');
      } else if (req.body && req.body.scope) {
        requestedScopes = req.body.scope.split(' ');
      }
    }
    return authService.authenticateCredential(clientId, clientSecret, credentialType)
      .then(consumer => {
        if (!consumer) {
          return done(null, false);
        }
        return authService.authorizeCredential(consumer.id, credentialType, endpointScopes || requestedScopes)
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
};
