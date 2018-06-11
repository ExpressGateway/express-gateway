const tokenIntrospectionGenerator = require('./token-introspector');
const urlEncoded = require('express').urlencoded();

module.exports = function (actionParams) {
  const tokenIntrospection = tokenIntrospectionGenerator(actionParams);
  let lastCheck;

  return (req, res, next) => {
    if (lastCheck && ((Date.now() - lastCheck) / 1000) < actionParams.ttl) {
      return next();
    }

    return urlEncoded(req, res, (err) => {
      if (err) return next(err);
      tokenIntrospection(req.body.token, req.body.token_type)
        .then(data => {
          lastCheck = Date.now();
          actionParams.getCommonAuthCallback(req, res, next)(null, data, data);
        })
        .catch(() => { actionParams.getCommonAuthCallback(req, res, next)(); });
    });
  };
};
