module.exports = {
  policy: require('./rate-limit'),
  schema: {
    type: 'object',
    properties: {
      rateLimitBy: {type: 'string'},
      windowMs: {type: 'integer'},
      delayAfter: {type: 'integer'},
      delayMs: {type: 'integer'},
      max: {type: 'integer'},
      message: {type: 'string'},
      statusCode: {type: 'integer'}
    }
  }
};
