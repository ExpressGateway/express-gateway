'use strict';
const logger = require('../log').logPolicy;
const ConfigurationError = require('../errors').ConfigurationError;
const vm = require('vm');

function createLogMiddleware (params) {
  if (!params || !params.message) {
    throw new ConfigurationError('Log middleware requires "message" param');
  }
  let script = new vm.Script('`' + params.message + '`');

  return function (req, res, next) {
    try {
      logger.info(script.runInNewContext(req));
    } catch (e) {
      logger.error('failed to build log message; ' + e.message);
    }
    next();
  };
}

module.exports = {
  log: createLogMiddleware
};
