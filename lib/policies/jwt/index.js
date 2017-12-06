const extractors = require('./extractors');

module.exports = {
  policy: require('./jwt'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/jwt.json',
    type: 'object',
    properties: {
      secretOrPublicKey: {
        type: 'string'
      },
      secretOrPublicKeyFile: {
        type: 'string'
      },
      jwtExtractor: {
        type: 'string',
        enum: Object.keys(extractors),
        default: 'authBearer'
      },
      jwtExtractorField: {
        type: 'string'
      },
      audience: {
        type: 'string'
      },
      issuer: {
        type: 'string'
      },
      checkCredentialExistence: {
        type: 'boolean',
        default: true
      }
    },
    required: ['jwtExtractor', 'checkCredentialExistence'],
    oneOf: [{ required: ['secretOrPublicKey'] }, { required: ['secretOrPublicKeyFile'] }]
  }
};
