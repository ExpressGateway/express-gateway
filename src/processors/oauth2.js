'use strict';

function createOauth2Middleware(params) {
  return function oauth2Middleware(req, res, next) {
    next();
  };
}

module.exports = {
  oauth2: createOauth2Middleware
};
