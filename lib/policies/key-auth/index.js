module.exports = {
  policy: require('./keyauth'),
  schema: {
    type: 'object',
    properties: {
      apiKeyHeader: { type: 'string' },
      apiKeyHeaderScheme: { type: 'string' },
      apiKeyField: { type: 'string' },
      disableHeaders: { type: 'boolean' },
      disableHeadersScheme: { type: 'boolean' },
      disableQueryParam: { type: 'boolean' }
    }
  }
};
