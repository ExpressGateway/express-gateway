module.exports = {
  policy: require('./oauth2-introspect'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/oauth2-introspect.json',
    type: 'object',
    properties: {
      passThrough: {
        type: 'boolean',
        default: false
      },
      endpoint: {
        type: 'string'
      },
      authorization_value: {
        type: 'string'
      },
      ttl: {
        type: 'integer',
        default: 60
      }
    },
    required: ['endpoint', 'ttl', 'passThrough']
  }
};
