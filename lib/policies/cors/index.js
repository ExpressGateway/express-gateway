module.exports = {
  policy: require('./cors'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/cors.json',
    type: 'object',
    properties: {
      origin: {
        type: ['string', 'boolean', 'array', 'object'],
        items: {
          type: ['string', 'object'],
          if: { type: 'object' },
          then: {
            instanceof: 'RegExp'
          }
        },
        if: { type: 'object' },
        then: {
          instanceof: 'RegExp'
        },
        default: '*',
        description: 'Configures the Access-Control-Allow-Origin CORS header.'
      },
      methods: {
        type: ['string', 'array'],
        items: { type: 'string' },
        default: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        description: 'Configures the Access-Control-Allow-Methods CORS header.'
      },
      allowedHeaders: {
        type: ['string', 'array'],
        items: { type: 'string' },
        description: 'Configures the Access-Control-Allow-Headers CORS header.'
      },
      exposedHeaders: {
        type: 'array',
        items: { type: 'string' },
        description: 'Configures the Access-Control-Expose-Headers CORS header.'
      },
      credentials: {
        type: 'boolean',
        description: ' Configures the Access-Control-Allow-Credentials CORS header. Set to true to pass the header, otherwise it is omitted.'
      },
      maxAge: {
        type: 'integer',
        description: 'Configures the Access-Control-Max-Age CORS header. Set to an integer to pass the header, otherwise it is omitted.'
      },
      optionsSuccessStatus: {
        type: 'integer',
        default: 204,
        description: 'Provides a status code to use for successful OPTIONS requests'
      }
    }
  }
};
