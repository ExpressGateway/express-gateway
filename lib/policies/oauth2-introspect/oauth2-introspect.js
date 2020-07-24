const tokenIntrospectionGenerator = require('./token-introspector');
const BearerStrategy = require('passport-http-bearer');
const passport = require('passport');
const uuid = require('uuid/v4');
const db = require('../../db');

module.exports = function (actionParams) {
  actionParams.session = false;
  const tokenIntrospection = tokenIntrospectionGenerator(actionParams);
  const strategyName = `bearer-introspect-${uuid()}`;

  passport.use(strategyName, new BearerStrategy({ passReqToCallback: true }, (req, accessToken, done) => {
    const requestedScopes = req.egContext.apiEndpoint.scopes;

    const scopeCheck = (tokenData, done) => {
      const tokenDataScopes = tokenData.scope || tokenData.scopes;
      const avaiableScopes = tokenDataScopes ? tokenDataScopes.split(' ') : [];

      if (requestedScopes.every(scope => avaiableScopes.includes(scope))) {
        return done(null, tokenData);
      }

      return done(null, false);
    };

    db.get('accesstoken.' + accessToken)
      .then(result => {
        if (result) {
          return scopeCheck(JSON.parse(result), done);
        } else {
          return tokenIntrospection(accessToken, 'access_token')
            .then(tokenData => {
              db.set('accesstoken.' + accessToken, JSON.stringify(tokenData));
              let expireInSeconds = actionParams.ttl;
              if (tokenData.exp &&
                expireInSeconds > (tokenData.exp - Date.now() / 1000)) {
                expireInSeconds = tokenData.exp - Date.now() / 1000;
              }
              db.expire('accesstoken.' + accessToken, expireInSeconds);
              return scopeCheck(tokenData, done);
            })
            .catch(() => { done(null, false); });
        }
      });
  }));

  return (req, res, next) => {
    passport.authenticate(strategyName, actionParams, actionParams.getCommonAuthCallback(req, res, next))(req, res, next);
  };
};
