module.exports = {
  policy: require('./auth'),
  schema: {
    type: 'object',
    properties: {
      passThrough: { type: 'boolean', default: false }
    }
  }
};
