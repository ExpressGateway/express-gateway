'use strict';
const logger = require('../log').logPolicy;
const ConfigurationError = require('../errors').ConfigurationError;
const vm = require('vm');
const util = require('util');

function createLogMiddleware(params) {
  if (!params || !params.message) {
    throw new ConfigurationError('Log middleware requires "message" param');
  }
  let script = new vm.Script('`' + params.message + '`')

  return function(req, res, next) {
    logger.info(util.inspect(script.runInNewContext(req)))
    next();
  };
}

module.exports = {
  log: createLogMiddleware
};