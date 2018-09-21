module.exports = {
  policy: require('./rate-limit'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/rate-limit.json',
    type: 'object',
    properties: {
      rateLimitBy: {
        type: 'string',
        description: 'The criteria that is used to limit the number of requests by. Can be a JS Expression'
      },
      windowMs: {
        type: 'integer',
        default: 60000,
        description: 'How long to keep records of requests in memory.'
      },
      delayAfter: {
        type: 'integer',
        default: 1,
        description: 'Max number of connections during windowMs before starting to delay responses.'
      },
      delayMs: {
        type: 'integer',
        default: 1000,
        description: 'How long to delay the response, in milliseconds.'
      },
      max: {
        type: 'integer',
        default: 5,
        description: 'Max number of connections during windowMs milliseconds before sending a 429 response. Set to 0 to disable.'
      },
      message: {
        type: 'string',
        default: 'Too many requests, please try again later.',
        description: 'Error message returned when max is exceeded.'
      },
      statusCode: {
        type: 'integer',
        default: 429,
        description: 'HTTP status code returned when max is exceeded.'
      }
    }
  }
};
