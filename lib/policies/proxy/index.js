module.exports = {
  policy: require('./proxy'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/proxy.json',
    type: 'object',
    properties: {
      auth: { type: 'string' },
      autoRewrite: { type: 'boolean', default: false },
      changeOrigin: { type: 'boolean', default: true },
      followRedirects: { type: 'boolean', default: false },
      hostRewrite: { type: 'string' },
      ignorePath: { type: 'boolean', default: false },
      prependPath: { type: 'boolean', default: true },
      preserveHeaderKeyCase: { type: 'boolean', default: false },
      protocolRewrite: {},
      proxyUrl: { type: 'string' },
      secure: { type: 'boolean', default: true },
      serviceEndpoint: { type: 'string' },
      stripPath: { type: 'boolean', default: false },
      strategy: { type: 'string', enum: ['round-robin'], default: 'round-robin' },
      toProxy: { type: 'boolean', default: false },
      xfwd: { type: 'boolean', default: false }

    },
    required: ['serviceEndpoint', 'strategy', 'changeOrigin', 'stripPath', 'ignorePath', 'prependPath', 'followRedirects']
  }
};
