'use strict';
const logger = require('../log').logPolicy;
const ConfigurationError = require('../errors').ConfigurationError;

function createLogMiddleware (params) {
  if (!params || !params.message) {
    throw new ConfigurationError('Log middleware requires "message" param');
  }

  return function (req, res, next) {
    try {
      logger.info(req.egContext.evaluateAsTemplateString(params.message));
    } catch (e) {
      logger.error('failed to build log message; ' + e.message);
    }
    next();
  };
}

module.exports = {
  log: createLogMiddleware
};
