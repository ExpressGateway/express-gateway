module.exports = {
  policy: require('./headers'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/headers.json',
    type: 'object',
    properties: {
      headersPrefix: {
        type: 'string'
      },
      forwardHeaders: {
        type: 'object'
      }
    }
  }
};
