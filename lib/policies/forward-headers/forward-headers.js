module.exports = function (params) {
  return (req, res, next) => {
    if (params.headersMap) {
      const prefix = params.headersPrefix || params.headerPrefix || '';
      req.egContext.forwardHeaders = req.egContext.forwardHeaders || {};
      for (const key in params.headersMap) {
        const val = params.headersMap[key];
        // key is new header name that will be prefixed with `headersPrefix`
        // val is some JS expression to execute against egContext
        req.egContext.forwardHeaders[prefix + key] = req.egContext.run(val);
      }
    }
    next();
  };
};
