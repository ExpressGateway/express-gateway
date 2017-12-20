module.exports = {
  policy: require('./keyauth'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/keyauth.json',
    type: 'object',
    properties: {
      apiKeyHeader: { type: 'string' },
      apiKeyHeaderScheme: { type: 'string' },
      apiKeyField: { type: 'string' },
      passThrough: { type: 'boolean', default: false },
      disableHeaders: { type: 'boolean' },
      disableHeadersScheme: { type: 'boolean' },
      disableQueryParam: { type: 'boolean' }
    }
  }
};
