module.exports = {
  policy: require('./expression'),
  schema: {
    type: 'object',
    properties: {
      jscode: {
        type: 'string'
      }
    },
    required: ['jscode']
  }
};
