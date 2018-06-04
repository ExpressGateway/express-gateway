const eventBus = require('../../eventBus');
const logger = require('../../logger').policy;
const jsonParser = require('express').json();
const urlEncoded = require('express').urlencoded({ extended: false });

module.exports = {
  policy: params => {
    eventBus.on('proxyReq', (proxyReq, req, res) => {
      if (req.body) {
        /*
         * This would be the section where I could change the body in the way I want
         */

        req.body.fp = 'coracao';

        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        return proxyReq.write(bodyData);
      }
      logger.warn('Unable to find a parsed body request. You might want to put the body parser policy first. Skipping the transform action');
    });

    return (req, res, next) => jsonParser(req, res, (err) => {
      if (err) return next(err);

      urlEncoded(req, res, (err) => {
        if (err) return next(err);
        const _write = res.write;

        res.write = function (data) {
          const body = JSON.parse(data);

          /*
           * This would be the section where I could change the body in the way I want
           */
          body.fp = 'coracao';

          const bodyData = JSON.stringify(body);

          res.setHeader('Content-Length', Buffer.byteLength(bodyData));
          _write.call(res, bodyData);
        };
        next();
      });
    });
  }
};
