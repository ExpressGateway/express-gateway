const tokenIntrospectionGenerator = require('./token-introspector');
const BearerStrategy = require('passport-http-bearer');
const passport = require('passport');

module.exports = function (actionParams) {
  actionParams.session = false;
  const scannedTokens = [];
  const tokenIntrospection = tokenIntrospectionGenerator(actionParams);

  passport.use('bearer-introspect', new BearerStrategy((accessToken, done) => {
    if (scannedTokens[accessToken] && ((Date.now() - scannedTokens[accessToken].lastCheck) / 1000) < actionParams.ttl) {
      return done(null, scannedTokens[accessToken].data);
    }

    return tokenIntrospection(accessToken, 'access_token')
      .then(data => {
        scannedTokens[accessToken] = { lastCheck: Date.now(), data };
        return done(null, data);
      })
      .catch(() => { done(null, false); });
  }));

  return (req, res, next) => {
    passport.authenticate('bearer-introspect', actionParams, actionParams.getCommonAuthCallback(req, res, next))(req, res, next);
  };
};
