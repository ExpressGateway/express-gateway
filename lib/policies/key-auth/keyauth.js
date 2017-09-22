const passport = require('passport');
const LocalAPIKeyStrategy = require('./passport-apikey-strategy');
let services = require('../../services/index');
let logger = require('../../logger').policy;
let authService = services.auth;
const credentialType = 'key-auth';
passport.use(new LocalAPIKeyStrategy({passReqToCallback: true}, (req, apikey, done) => {
  // key will look like "h1243h1kl23h4kjh:asfasqwerqw"
  if (!apikey) {
    return done(null, false);
  }

  let keyParts = apikey.split(':');

  // as per http://passportjs.org/docs/authorize
  // after authentication  req.user is populated
  // and after authorization req.account is filled in
  authService.authenticateCredential(keyParts[0], keyParts[1], credentialType)
    .then(consumer => {
      if (!consumer) {
        return done(null, false);
      }
      let endpointScopes = req.egContext.apiEndpoint.scopes && req.egContext.apiEndpoint.scopes.map(s => s.scope || s);
      req.user = consumer;

      return authService.authorizeCredential(keyParts[0], credentialType, endpointScopes)
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

module.exports = function (params) {
  params = params || {};

  return function (req, res, next) {
    params.session = false;
    passport.authenticate('localapikey', params, (err, user, info) => {
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
  };
};
