const tokenIntrospectionGenerator = require('./token-introspector');
const urlEncoded = require('express').urlencoded({ extended: false });
const { PassThrough } = require('stream');

module.exports = function (actionParams) {
  actionParams.session = false;
  const tokenIntrospection = tokenIntrospectionGenerator(actionParams);
  let lastCheck;

  return (req, res, next) => {
    if (lastCheck && ((Date.now() - lastCheck) / 1000) < actionParams.ttl) {
      return next();
    }

    req.egContext.requestStream = new PassThrough();
    req.pipe(req.egContext.requestStream);

    return urlEncoded(req, res, (err) => {
      if (err) return next(err);
      tokenIntrospection(req.body.token, req.body.token_type)
        .then(data => {
          lastCheck = Date.now();
          actionParams.getCommonAuthCallback(req, res, next)(null, data, null);
        })
        .catch(() => { actionParams.getCommonAuthCallback(req, res, next)(); });
    });
  };
};
