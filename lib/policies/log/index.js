module.exports = {
  policy: require('./log'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/log.json',
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'A template expression to print out on the log stream',
        examples: ['This is a log message']
      }
    },
    required: ['message']
  }
};
