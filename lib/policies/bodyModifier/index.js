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
      if (res.body) {
        const body = JSON.parse(res.body);

        // Change things

        // CHange things
        const bodyData = JSON.stringify(body);
        return proxyRes.write(bodyData);
      }

      logger.warn('Unable to find any body response. Skipping the transformation step');
    });

    return (req, res, next) => next();
  },
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/bodyModifier.json',
    type: 'object',
    properties: {}
  }
};
