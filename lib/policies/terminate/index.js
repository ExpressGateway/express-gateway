module.exports = {
  policy: require('./terminate'),
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number' },
      message: { type: 'string' }
    }
  }
};
