module.exports = {
  policy: require('./rate-limit'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/rate-limit.json',
    type: 'object',
    properties: {
      rateLimitBy: { type: 'string' },
      windowMs: { type: 'integer', default: 60000 },
      delayAfter: { type: 'integer', default: 1 },
      delayMs: { type: 'integer', default: 1000 },
      max: { type: 'integer', default: 5 },
      message: { type: 'string', default: 'Too many requests, please try again later.' },
      statusCode: { type: 'integer', default: 429 }
    }
  }
};
