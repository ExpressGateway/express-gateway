const status = require('statuses')
const {GatewayError} = require('../errors');

function errorHelper (req, res, next) {
  res.egError = (code = 500, errors = []) => {
    if (code instanceof Error) { // call with err arg
      code = 500;
      errors = [code.message];
    } else {
      switch (typeof code) {
        case 'number': // call with code and message
          if (!Array.isArray(errors)) {
            errors = typeof errors === 'string' ? [errors] : [];
          }
          break;
        case 'string': // call with message
          errors = [code];
          code = 500;
          break;
        default:
          code = 500;
          errors = [];
      }
    }
    next(new GatewayError(code, errors));
  };

  next();
}

function notFoundHandler (req, res, next) {
  res.egError(404);
}

function errorHandler (err, req, res, next) {
  let code = 500;
  let errors = [];
  if (err instanceof GatewayError) {
    code = err.code;
    errors = err.errors;
  } else if (err instanceof Error && err.message) {
    errors = [err.message];
  }
  if (!status[code]) {
    code = 500;
  }

  if (!errors.length) {
    errors = [status[code]];
  }

  res.status(code);
  res.json({
    code,
    errors
  });
}

module.exports = {
  errorHelper,
  notFoundHandler,
  errorHandler
};
