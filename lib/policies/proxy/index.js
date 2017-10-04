module.exports = {
  policy: require('./proxy'),
  schema: {
    type: 'object',
    properties: {
      serviceEndpoint: {type: 'string'},
      changeOrigin: {type: 'boolean'},
      strategy: {type: 'string'}
    },
    required: ['serviceEndpoint']
  }
};
