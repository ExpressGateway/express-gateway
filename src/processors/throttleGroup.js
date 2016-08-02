'use strict';

const debug = require('debug')('gateway:throttleGroup');

module.exports = function createMiddleware(_params) {
  return function proxyMiddleware(_req, _res, next) {
    debug('throttleGroup middleware');
    next();
  };
};
