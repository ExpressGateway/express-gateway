module.exports = {
  policy: require('./auth'),
  schema: {
    passThrough: { type: 'boolean' }
  }
};
