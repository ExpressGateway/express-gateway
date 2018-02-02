module.exports = {
  policy: require('./keyauth'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/keyauth.json',
    type: 'object',
    properties: {
      apiKeyHeader: { type: 'string', default: 'Authorization' },
      apiKeyHeaderScheme: { type: 'string', default: 'apiKey' },
      apiKeyField: { type: 'string', default: 'apiKey' },
      passThrough: { type: 'boolean', default: false },
      disableHeaders: { type: 'boolean', default: false },
      disableHeadersScheme: { type: 'boolean', default: false },
      disableQueryParam: { type: 'boolean', default: false }
    }
  }
};
