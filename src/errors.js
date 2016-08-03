'use strict';

let util = require('util');

function CustomError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
}
util.inherits(CustomError, Error);

class MisconfigurationError extends CustomError {}

module.exports = {
  CustomError,
  MisconfigurationError
};
