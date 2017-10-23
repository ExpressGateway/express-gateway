module.exports = {
  policy: require('./log'),
  schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string'
      }
    },
    required: ['message']
  }
};
