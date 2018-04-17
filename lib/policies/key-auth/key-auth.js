const passport = require('passport');
const uuid = require('uuid/v4');
const LocalAPIKeyStrategy = require('passport-localapikey-update').Strategy;
const logger = require('../../logger').policy;
const authService = require('../../services/index').auth;

const credentialType = 'key-auth';

module.exports = function (params) {
  const strategyName = `localapikey-${uuid()}`;

  passport.use(strategyName, new LocalAPIKeyStrategy(Object.assign({ passReqToCallback: true }, params), (req, apikey, done) => {
    // key will look like "h1243h1kl23h4kjh:asfasqwerqw"
    if (!apikey) {
      return done(null, false);
    }

    const keyParts = apikey.split(':');

    authService.authenticateCredential(keyParts[0], keyParts[1], credentialType)
      .then(consumer => {
        if (!consumer) {
          return done(null, false);
        }
        const endpointScopes = req.egContext.apiEndpoint.scopes && req.egContext.apiEndpoint.scopes.map(s => s.scope || s);

        return authService.authorizeCredential(keyParts[0], credentialType, endpointScopes)
          .then(authorized => {
            if (!authorized) {
              return done(null, false, { unauthorized: true });
            }
            consumer.authorizedScopes = endpointScopes;
            return done(null, consumer);
          });
      })
      .catch(err => {
        logger.warn(err);
        done(err);
      });
  }));

  return (req, res, next) => {
    params.session = false;
    passport.authenticate(strategyName, params, params.getCommonAuthCallback(req, res, next))(req, res, next);
  };
};
