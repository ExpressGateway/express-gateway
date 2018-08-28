module.exports = {
  policy: require('./key-auth'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/key-auth.json',
    type: 'object',
    properties: {
      apiKeyHeader: {
        type: 'string',
        default: 'Authorization',
        description: 'HTTP Header to look for the apiScheme + apiKey string'
      },
      apiKeyHeaderScheme: {
        type: 'string',
        default: 'apiKey',
        description: 'HTTP Authorization Scheme to verify before extracting the API Key'
      },
      apiKeyField: {
        type: 'string',
        default: 'apiKey',
        description: 'Query String parameter name to look for to extract the apiKey'
      },
      passThrough: {
        type: 'boolean',
        default: false
      },
      disableHeaders: {
        type: 'boolean',
        default: false,
        description: 'Entirely disable lookup API Key from the header'
      },
      disableHeadersScheme: {
        type: 'boolean',
        default: false,
        description: 'Enable or disable apiScheme check'
      },
      disableQueryParam: {
        type: 'boolean',
        default: false,
        description: 'Entirely disable lookup API Key from the query string'
      }
    }
  }
};
