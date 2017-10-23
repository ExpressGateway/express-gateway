const RateLimit = require('express-rate-limit');
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
  return new RateLimit(params);
};
