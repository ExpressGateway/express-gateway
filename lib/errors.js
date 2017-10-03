class CustomError extends Error {
  constructor (message) {
    super();
    this.message = message;
  }
}

class ConfigurationError extends CustomError {}

class GatewayError extends CustomError {
  constructor (code = 500, errors = []) {
    super(code);
    this.code = code;
    this.errors = errors;
  }
}

module.exports = {
  CustomError,
  ConfigurationError,
  GatewayError
};
