module.exports = {
  policy: require('./expression'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/expression.json',
    type: 'object',
    properties: {
      jscode: {
        type: 'string',
        description: 'Javascript code to execute against the current egContext'
      }
    },
    required: ['jscode']
  }
};
