module.exports = {
  policy: require('./terminate'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/terminate.json',
    type: 'object',
    properties: {
      statusCode: { type: 'number' },
      message: { type: 'string' }
    }
  }
};
