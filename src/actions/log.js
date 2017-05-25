'use strict';
const logger = require('../log').logPolicy;
const ConfigurationError = require('../errors').ConfigurationError;
const vm = require('vm');

function createLogMiddleware(params) {
  if (!params || !params.message) {
    throw new ConfigurationError('Log middleware requires "message" param');
  }
  let script = new vm.Script('`' + params.message + '`')

  return function(req, res, next) {
    logger.info(script.runInNewContext(req))
    next();
  };
}

module.exports = {
  log: createLogMiddleware
};