module.exports = {
  policy: require('./basic-auth'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/basic-auth.json',
    allOf: [
      { $ref: 'http://express-gateway.io/schemas/base/auth.json' }
    ]
  }
};
