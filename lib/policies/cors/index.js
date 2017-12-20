module.exports = {
  policy: require('./cors'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/cors.json',
    type: 'object',
    properties: {
      origin: {
        type: ['string', 'boolean', 'array'],
        items: { type: 'string' }
      },
      methods: {
        type: ['string', 'array'],
        items: { type: 'string' }
      },
      allowedHeaders: {
        type: ['string', 'array'],
        items: { type: 'string' }
      },
      exposedHeaders: {
        type: 'array',
        items: { type: 'string' }
      },
      credentials: {
        type: 'boolean'
      },
      maxAge: {
        type: 'integer'
      },
      optionsSuccessStatus: {
        type: 'integer'
      }
    }
  }
};
