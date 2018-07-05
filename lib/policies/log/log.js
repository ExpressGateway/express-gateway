const { createLoggerWithLabel } = require('../../logger');
const logger = createLoggerWithLabel('[EG:log-policy]');

module.exports = function (params) {
  if (!params || !params.message) {
    throw new Error('Log middleware requires "message" param');
  }

  return function (req, res, next) {
    try {
      logger.info(req.egContext.evaluateAsTemplateString(params.message));
    } catch (e) {
      logger.error(`failed to build log message: ${e.message}`);
    }
    next();
  };
};
