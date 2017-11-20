module.exports = function (params) {
  return (req, res, next) => {
    if (params.forwardHeaders) {
      const prefix = params.headersPrefix || params.headerPrefix || '';
      for (const key in params.forwardHeaders) {
        const val = params.forwardHeaders[key];
        // key is new header name that will be prefixed with `headersPrefix`
        // val is some JS expression to execute against egContext
        req.headers[prefix + key] = req.egContext.run(val);
      }
    }
    next();
  };
};
