module.exports = {
  policy: require('./auth'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/basic-auth.json',
    type: 'object',
    properties: {
      passThrough: { type: 'boolean', default: false }
    }
  }
};
