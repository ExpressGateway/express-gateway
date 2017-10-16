const RateLimit = require('express-rate-limit');
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

  params.handler = (req, res) => {
    res.egError(429);
  };

  const limiter = new RateLimit(params);
  return limiter;
};
