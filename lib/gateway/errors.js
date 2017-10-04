const {GatewayError} = require('../errors');

function errorHelper (req, res, next) {
  res.egError = (code = 500, errors = []) => {
    next(new GatewayError(code, errors));
  };

  next();
}

function notFoundHandler (req, res) {
  res.egError(404);
}

function errorHandler (err, req, res, next) {
  if (!(err instanceof GatewayError)) {
    err = new GatewayError(err);
  }

  res.status(err.response.code);
  res.json(err.response);
}

module.exports = {
  errorHelper,
  notFoundHandler,
  errorHandler
};
