let RateLimit = require('express-rate-limit');
const logger = require('../../logger').logPolicy;

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
  let limiter = new RateLimit(params);
  return limiter;
};
