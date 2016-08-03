'use strict';

const debug = require('debug')('gateway:throttle');
const RateLimiter = require('limiter').RateLimiter;

function createThrottleGroupMiddleware(params) {
  return function throttleGroupMiddleware(req, _res, next) {
    if (req.throttleGroups === undefined) {
      req.throttleGroups = new Set();
    }

    let key = params.key || 'all';
    debug(`adding request throttle group: ${key}`);
    req.throttleGroups.add(key);
    next();
  };
}

function createThrottleMiddleware(params) {
  let limiters = {};
  for (const key in params) {
    limiters[key] = new RateLimiter(params[key].rate, params[key].period, true);
  }

  return function throttleMiddleware(req, res, next) {
    let throttleGroups = req.throttleGroups || [];
    let rejectedGroups = [...throttleGroups].filter(key => {
      return (limiters[key] && limiters[key].getTokensRemaining() < 1);
    });

    if (rejectedGroups.length > 0) {
      debug(`request rejected by throttling (${rejectedGroups})`);
      res.status(429);
      res.send('Too many requests');
    } else {
      for (const key of throttleGroups) {
        if (limiters[key]) {
          limiters[key].tryRemoveTokens(1);
        }
      }
      next();
    }
  };
}

module.exports = {
  throttleGroup: createThrottleGroupMiddleware,
  throttle: createThrottleMiddleware
};
