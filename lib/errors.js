const statuses = require('statuses');

class CustomError extends Error {
  constructor (message) {
    super();
    this.message = message;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ConfigurationError extends CustomError {}

class GatewayError extends CustomError {
  constructor (code = 500, errors = null) {
    super();
    this.code = 500;
    this.error = null;
    this.errors = [];
    switch (typeof code) {
      case 'number':
        if (code >= 400 && code < 600) {
          this.code = code;
        }
        break;
      default:
        errors = code;
    }
    if (Array.isArray(errors)) {
      this.errors = errors.filter((error) => error && typeof error === 'string');
    } else if (typeof errors === 'string') {
      this.error = errors;
    } else if (errors instanceof Error) {
      this.error = errors.message;
    }
  }

  get response () {
    const {code, errors, error} = this;
    const result = {code};
    if (errors.length) {
      Object.assign(result, {errors});
    } else {
      Object.assign(result, {
        error: error || statuses[code]
      });
    }
    return result;
  }
}

module.exports = {
  CustomError,
  ConfigurationError,
  GatewayError
};
