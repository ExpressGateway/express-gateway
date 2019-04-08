const schemas = require('../../schemas');
const jwtSchema = require('../jwt').schema;

schemas.register('policy', 'jwt', jwtSchema);

module.exports = {
  policy: require('./oauth2'),
  routes: require('./oauth2-routes'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/oauth2.json',
    allOf: [
      { $ref: 'http://express-gateway.io/schemas/base/auth.json' },
      {
        type: 'object',
        properties: {
          jwt: { '$ref': 'jwt.json' }
        }
      }]
  }
};
