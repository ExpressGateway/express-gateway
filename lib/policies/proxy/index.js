module.exports = {
  policy: require('./proxy'),
  schema: {
    $id: 'http://express-gateway.io/schemas/proxy.json',
    type: 'object',
    properties: {
      serviceEndpoint: {$ref: 'config.json#/gateway/serviceEndpoint'},
      changeOrigin: {type: 'boolean'},
      proxyUrl: {type: 'string'},
      strategy: {type: 'string', enum: ['round-robin']}
    },
    required: ['serviceEndpoint']
  }
};
