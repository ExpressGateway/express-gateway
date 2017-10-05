'use strict';

const util = require('util');

function CustomError (message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
}
util.inherits(CustomError, Error);

class ConfigurationError extends CustomError {}

module.exports = {
  CustomError,
  ConfigurationError
};
