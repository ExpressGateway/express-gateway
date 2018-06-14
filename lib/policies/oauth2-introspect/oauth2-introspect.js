const tokenIntrospectionGenerator = require('./token-introspector');
const BearerStrategy = require('passport-http-bearer');
const passport = require('passport');

module.exports = function (actionParams) {
  actionParams.session = false;
  const lastChecks = [];
  const tokenIntrospection = tokenIntrospectionGenerator(actionParams);

  passport.use('bearer-introspect', new BearerStrategy((accessToken, done) => {
    if (lastChecks[accessToken] && ((Date.now() - lastChecks[accessToken]) / 1000) < actionParams.ttl) {
      return done(null, { active: true });
    }

    return tokenIntrospection(accessToken, 'access_token')
      .then(data => {
        lastChecks[accessToken] = Date.now();
        return done(null, data);
      })
      .catch(() => { done(null, false); });
  }));

  return (req, res, next) => {
    passport.authenticate('bearer-introspect', actionParams, actionParams.getCommonAuthCallback(req, res, next))(req, res, next);
  };
};
