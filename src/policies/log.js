'use strict';

const ConfigurationError = require('../errors').ConfigurationError;

function createLogMiddleware(params) {
  if (!params || !params.message) {
    throw new ConfigurationError('Log middleware requires "message" param');
  }

  // eslint-disable-next-line no-unused-vars
  return function(req, res, next) {
    const message = eval('`' + params.message + '`');
    console.log(message);
    next();
  };
}

module.exports = {
  log: createLogMiddleware
};