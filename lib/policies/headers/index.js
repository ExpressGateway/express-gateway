module.exports = {
  policy: require('./headers'),
  schema: {
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
