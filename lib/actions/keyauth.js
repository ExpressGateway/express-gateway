const passport = require('passport');
const LocalAPIKeyStrategy = require('passport-localapikey-update').Strategy;
let services = require('../services/index');
let logger = require('../log').policy;
let authService = services.auth;
const credentialType = 'key-auth';
let credConfig = require('../../lib/config/models/credentials');
let apiKeyField = 'apikey';
let apiKeyHeader = 'authorization';
let keyauthConfig = credConfig['key-auth'];
if (keyauthConfig) {
  apiKeyField = keyauthConfig.apiKeyField ? keyauthConfig.apiKeyField : apiKeyField;
  apiKeyHeader = keyauthConfig.apiKeyHeader ? keyauthConfig.apiKeyHeader : apiKeyHeader;
}
passport.use(new LocalAPIKeyStrategy({passReqToCallback: true, apiKeyField, apiKeyHeader}, (req, apikey, done) => {
  // key can look like "apikey h1243h1kl23h4kjh:asfasqwerqw"
  // or  "h1243h1kl23h4kjh:asfasqwerqw"
  if (!apikey) {
    return done(null, false);
  }
  let parts = apikey.split(' ');
  let keyParts = parts[parts.length - 1].split(':');

  // as per http://passportjs.org/docs/authorize
  // after authentication  req.user is populated
  // and after authorization req.account is filled in
  authService.authenticate({keyId: keyParts[0], keySecret: keyParts[1]}, credentialType)
    .then(consumer => {
      if (!consumer) {
        return done(null, false);
      }
      let endpointScopes = req.egContext.apiEndpoint.scopes.map(s => s.scope || s);
      req.user = consumer;

      let id = (consumer.type === 'user') ? consumer.username : consumer.id;
      return authService.authorizeCredential(id, credentialType, endpointScopes)
        .then(authorized => {
          if (!authorized) {
            return done(null, false);
          }
          consumer.authorizedScopes = endpointScopes;
          req.account = consumer;
          return done(null, consumer);
        });
    })
    .catch(err => {
      logger.warn(err);
      done(err);
    });
}));

module.exports = {
  keyauth: actionParams => (req, res, next) => {
    passport.authenticate('localapikey', {
      session: false
    }, (err, user, info) => {
      if (err) { return next(err); }
      if (!req.user) { // user is not authenticated
        res.status(401);
        res.send('Forbidden');
      } else if (!req.account) {   // user is not authorized
        res.status(403);
        res.send('Unauthorized');
      } else {
        req.egContext.user = req.account;
        next();
      }
    })(req, res, next);
  }

};
