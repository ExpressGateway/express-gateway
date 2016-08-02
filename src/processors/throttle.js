'use strict';

module.exports = function createMiddleware(params) {
  return function proxyMiddleware(req, res, next) {
    next();
  };
};
