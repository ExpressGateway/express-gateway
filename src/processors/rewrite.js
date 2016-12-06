'use strict';

const MisconfigurationError = require('../errors').MisconfigurationError;

function createRewriteMiddleware(params) {
  if (!params || !params.match || !params.replace) {
    throw new MisconfigurationError(
      'Rewrite middleware requires "match" and "replace" params');
  }

  if (params.redirect && Math.floor(params.redirect / 100) !== 3) {
    throw new MisconfigurationError(
      'Rewrite middleware "redirect" param should be 300 <= value < 400');
  }

  let match = new RegExp(params.match);

  // eslint-disable-next-line no-unused-vars
  return function(req, res, next) {
    let newUrl = req.url.replace(match, params.replace, params.flags || 'g');
    if (params.redirect) {
      res.redirect(params.redirect, req.baseUrl + newUrl);
    } else {
      req.url = newUrl;
      next();
    }
  };
}

module.exports = {
  rewrite: createRewriteMiddleware
};
