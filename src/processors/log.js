'use strict';

const MisconfigurationError = require('../errors').MisconfigurationError;

function createLogMiddleware(params) {
  if (!params || !params.message) {
    throw new MisconfigurationError('Log middleware requires "message" param');
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
