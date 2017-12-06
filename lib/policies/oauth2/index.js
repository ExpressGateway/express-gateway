module.exports = {
  policy: require('./oauth2'),
  routes: require('./oauth2-routes'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/oauth2.json',
    type: 'object',
    properties: {
      passThrough: { type: 'boolean', default: false },
      jwt: { '$ref': 'jwt.json' }
    },
    required: ['passThrough']
  }
};
