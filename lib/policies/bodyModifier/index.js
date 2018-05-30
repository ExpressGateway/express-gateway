const eventBus = require('../../eventBus');
const logger = require('../../logger').policy;

module.exports = {
  policy: params => {
    eventBus.on('proxyReq', (proxyReq, req, res) => {
      if (req.body) {
        // Change the things

        // End Change the things

        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        return proxyReq.write(bodyData);
      }

      logger.warn('Unable to find a parsed body request. You might want to put the body parser policy first. Skipping the transform action');
    });

    eventBus.on('proxyRes', (proxyRes, req, res) => {
      const _write = res.write;

      res.write = function (data) {
        const body = JSON.parse(data);
        body.fp = 'coracao';

        const bodyData = JSON.stringify(body);

        res.setHeader('Content-Length', Buffer.byteLength(bodyData));
        _write.call(res, bodyData);
      };
    });

    return (req, res, next) => next();
  }
};
