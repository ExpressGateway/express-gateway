'use strict';

function throttleGroupMiddleware(_req, _res, next) {
  next();
}

function throttleMiddleware(_req, _res, next) {
  next();
};

module.exports = {
  throttleGroup: _ => throttleGroupMiddleware,
  throttle: _ => throttleMiddleware
};
