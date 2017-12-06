const logger = require('../../logger').policy;
module.exports = function (params) {
  return (req, res, next) => {
    if (params.forwardHeaders) {
      for (const key in params.forwardHeaders) {
        const val = params.forwardHeaders[key];
        // key is new header name that will be prefixed with `headersPrefix`
        // val is some JS expression to execute against egContext
        req.headers[params.headersPrefix + key] = req.egContext.run(val);
      }
    } else {
      logger.warn('No forward headers defined');
    }
    next();
  };
};
