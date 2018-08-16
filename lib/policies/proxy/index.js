module.exports = {
  policy: require('./proxy'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/proxy.json',
    type: 'object',
    properties: {
      serviceEndpoint: { type: 'string' },
      changeOrigin: { type: 'boolean', default: true },
      proxyUrl: { type: 'string' },
      stripPath: { type: 'boolean', default: false },
      ignorePath: { type: 'boolean', default: false },
      strategy: { type: 'string', enum: ['round-robin'], default: 'round-robin' }
    },
    required: ['serviceEndpoint', 'strategy', 'changeOrigin', 'stripPath', 'ignorePath']
  }
};
