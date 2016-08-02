'use strict';

const debug = require('debug')('gateway:throttleGroup');

module.exports = function createMiddleware(params) {
  return function proxyMiddleware(req, res, next) {
    debug('throttleGroup middleware');
    next();
  };
};
