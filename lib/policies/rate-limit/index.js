module.exports = {
  policy: require('./rate-limit'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/rate-limit.json',
    type: 'object',
    properties: {
      rateLimitBy: { type: 'string' },
      windowMs: { type: 'integer' },
      delayAfter: { type: 'integer' },
      delayMs: { type: 'integer' },
      max: { type: 'integer' },
      message: { type: 'string' },
      statusCode: { type: 'integer' }
    }
  }
};
