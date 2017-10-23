module.exports = {
  policy: require('./expression'),
  schema: {
    $id: 'http://express-gateway.io/schemas/expression.json',
    type: 'object',
    properties: {
      jscode: {$ref: 'defs.json#/definitions/jscode'}
    },
    required: ['jscode']
  }
};
