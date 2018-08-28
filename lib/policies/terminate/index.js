module.exports = {
  policy: require('./terminate'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/terminate.json',
    type: 'object',
    properties: {
      statusCode: { type: 'number', default: 400, description: 'HTTP Status Code to return for the request' },
      message: { type: 'string', default: 'Terminated', description: 'text/plain message to return as a response' }
    },
    required: ['statusCode', 'message']
  }
};
