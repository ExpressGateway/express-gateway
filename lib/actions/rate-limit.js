let RateLimit = require('express-rate-limit');
const logger = require('../log').logPolicy;

module.exports = {
  'rate-limit': (actionParams) => {
    if (actionParams.rateLimitBy) {
      actionParams.keyGenerator = (req) => {
        try {
          return req.egContext.evaluateAsTemplateString(actionParams.rateLimitBy);
        } catch (err) {
          logger.error('Failed to generate rate-limit key with config: %s; %s', actionParams.rateLimitBy, err.message);
        }
      };
    }
    let limiter = new RateLimit(actionParams);
    return limiter;
  }
};
