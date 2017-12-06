module.exports = {
  policy: require('./proxy'),
  schema: {
    $id: 'http://express-gateway.io/schemas/proxy.json',
    type: 'object',
    properties: {
      serviceEndpoint: { type: 'string' },
      changeOrigin: { type: 'boolean' },
      proxyUrl: { type: 'string' },
      strategy: { type: 'string', enum: ['round-robin'] }
    },
    required: ['serviceEndpoint']
  }
};
