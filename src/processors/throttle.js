'use strict';

module.exports = function createMiddleware(_params) {
  return function proxyMiddleware(_req, _res, next) {
    next();
  };
};
