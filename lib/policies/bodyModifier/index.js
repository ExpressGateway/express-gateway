const logger = require('../../logger').policy;
const jsonParser = require('express').json();
const urlEncoded = require('express').urlencoded({ extended: false });

module.exports = {
  policy: params => {
    return (req, res, next) => jsonParser(req, res, (err) => {
      if (err) return next(err);

      urlEncoded(req, res, (err) => {
        if (err) return next(err);
        const _write = res.write;

        req.egContext.transformFn = function transformFn (proxyReq, req, res) {
          if (req.body) {
            params.request.add.forEach(addParam => { req.body[addParam.name] = addParam.value; });
            params.request.remove.forEach(removeParam => { delete req.body[removeParam.name]; });

            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            return proxyReq.write(bodyData);
          }
          logger.warn('Unable to find a parsed body request. You might want to put the body parser policy first. Skipping the transform action');
        };

        res.write = function (data) {
          const body = JSON.parse(data);

          params.response.add.forEach(addParam => { body[addParam.name] = addParam.value; });
          params.response.remove.forEach(removeParam => { delete body[removeParam.name]; });

          const bodyData = JSON.stringify(body);

          res.setHeader('Content-Length', Buffer.byteLength(bodyData));
          _write.call(res, bodyData);
        };
        next();
      });
    });
  }
};
