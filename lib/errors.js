const statuses = require('statuses');

class BaseError extends Error {
  constructor (message = '') {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ConfigurationError extends BaseError {}

class GatewayError extends BaseError {
  constructor (...args) {
    super();

    let [code, errors] = args;
    if (typeof code !== 'number' || code < 400 || code >= 600) {
      errors = code;
      code = 500;
    }

    if (!Array.isArray(errors)) {
      errors = [errors];
    }

    errors = errors
      .map((error) => {
        if (error instanceof Error) {
          error = error.message;
        }
        return error;
      })
      .filter(error => error && typeof error === 'string');

    if (!errors.length) {
      errors.push(statuses[code]);
    }

    this.response = {
      code,
      errors
    };
  }
}

module.exports = {
  ConfigurationError,
  GatewayError
};
