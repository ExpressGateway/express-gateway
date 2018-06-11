module.exports = {
  policy: require('./oauth2-introspect'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/oauth2-introspect.json',
    type: 'object',
    properties: {
      endpoint: {
        type: 'string'
      },
      client_id: {
        type: 'string'
      },
      client_secret: {
        type: 'string'
      },
      access_token: {
        type: 'string'
      },
      ttl: {
        type: 'integer',
        default: 60
      }
    },
    required: ['endpoint', 'ttl'],
    oneOf: [{ required: ['client_id'] }, { required: ['access_token'] }]
  }
};
