module.exports = {
  policy: require('./terminate'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/terminate.json',
    type: 'object',
    properties: {
      statusCode: { type: 'number', default: 400 },
      message: { type: 'string', default: 'Terminated' }
    },
    required: ['statusCode', 'message']
  }
};
