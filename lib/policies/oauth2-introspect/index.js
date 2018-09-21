module.exports = {
  policy: require('./oauth2-introspect'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/oauth2-introspect.json',
    allOf: [
      { $ref: 'http://express-gateway.io/schemas/base/auth.json' },
      {
        type: 'object',
        properties: {
          endpoint: {
            type: 'string',
            format: 'uri',
            description: 'Endpoint that will be used to validate the provided token',
            examples: ['https://authorization.server/oauth2-introspect']
          },
          authorization_value: {
            type: 'string',
            description: 'Value put as Authorization header that\'ll be sent as part of the HTTP request to the specified endpoint'
          },
          ttl: {
            title: 'TTL',
            type: 'integer',
            default: 60,
            description: 'Time, in seconds, in which the current token, if validated before, will be consider as valid without making a new request to the authorization endpoint'
          }
        },
        required: ['endpoint', 'ttl']
      }
    ]
  }
};
