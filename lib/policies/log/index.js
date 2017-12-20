module.exports = {
  policy: require('./log'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/log.json',
    type: 'object',
    properties: {
      message: {
        type: 'string'
      }
    },
    required: ['message']
  }
};
