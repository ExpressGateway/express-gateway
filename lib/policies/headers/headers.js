const log = require('../../logger').policy;

module.exports = function (params) {
  return (req, res, next) => {
    for (const key in params.forwardHeaders) {
      const val = params.forwardHeaders[key];
      const headerName = params.headersPrefix + key;
      log.debug(`Adding ${headerName} header to the request`);
      req.headers[headerName] = req.egContext.run(val);
    }
    next();
  };
};
