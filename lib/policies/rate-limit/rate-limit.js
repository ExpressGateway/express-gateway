const RateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const logger = require('../../logger').policy;

module.exports = (params) => {
  if (params.rateLimitBy) {
    params.keyGenerator = (req) => {
      try {
        return req.egContext.evaluateAsTemplateString(params.rateLimitBy);
      } catch (err) {
        logger.error('Failed to generate rate-limit key with config: %s; %s', params.rateLimitBy, err.message);
      }
    };
  }
  return new RateLimit(Object.assign(params, {
    store: new RedisStore({
      client: require('../../db'),
      expiry: params.windowMs / 1000
    })
  }));
};
