module.exports = {
  policy: require('./headers'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/headers.json',
    type: 'object',
    properties: {
      headersPrefix: {
        type: 'string',
        default: '',
        description: 'A prefix string to be attached to any sent headers'
      },
      forwardHeaders: {
        type: 'object',
        description: 'A key-value pair of headers/value to be added to the current http request',
        examples: [{ 'X-API-Gateway': 'Express-Gateway' }]
      }
    },
    required: ['headersPrefix', 'forwardHeaders']
  }
};
