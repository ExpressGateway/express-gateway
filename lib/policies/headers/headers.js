const logger = require('../../logger').policy;
module.exports = function (params) {
  if (!params.forwardHeaders) {
    logger.warn('No forward headers defined');
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    for (const key in params.forwardHeaders) {
      const val = params.forwardHeaders[key];
      // key is new header name that will be prefixed with `headersPrefix`
      // val is some JS expression to execute against egContext
      req.headers[params.headersPrefix + key] = req.egContext.run(val);
    }
    next();
  };
};
