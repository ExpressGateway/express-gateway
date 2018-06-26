const tokenIntrospectionGenerator = require('./token-introspector');
const BearerStrategy = require('passport-http-bearer');
const passport = require('passport');

module.exports = function (actionParams) {
  actionParams.session = false;
  const scannedTokens = [];
  const tokenIntrospection = tokenIntrospectionGenerator(actionParams);

  passport.use('bearer-introspect', new BearerStrategy({ passReqToCallback: true }, (req, accessToken, done) => {
    const requestedScopes = req.egContext.apiEndpoint.scopes;

    const scopeCheck = (tokenData, done) => {
      const avaiableScopes = tokenData.scopes ? tokenData.scopes.split(' ') : [];

      if (requestedScopes.every(scope => avaiableScopes.includes(scope))) {
        return done(null, tokenData);
      }

      return done(null, false);
    };

    if (scannedTokens[accessToken] && ((Date.now() - scannedTokens[accessToken].lastCheck) / 1000) < actionParams.ttl) {
      return scopeCheck(scannedTokens[accessToken].tokenData, done);
    }

    tokenIntrospection(accessToken, 'access_token')
      .then(tokenData => {
        scannedTokens[accessToken] = { lastCheck: Date.now(), tokenData };

        return scopeCheck(tokenData, done);
      })
      .catch(() => { done(null, false); });
  }));

  return (req, res, next) => {
    passport.authenticate('bearer-introspect', actionParams, actionParams.getCommonAuthCallback(req, res, next))(req, res, next);
  };
};
