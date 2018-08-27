const extractors = require('./extractors');

module.exports = {
  policy: require('./jwt'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/jwt.json',
    type: 'object',
    properties: {
      secretOrPublicKey: {
        type: 'string',
        description: 'The secret (symmetric) or PEM-encoded public key (asymmetric) for verifying the token\'s signature.'
      },
      secretOrPublicKeyFile: {
        type: 'string',
        description: 'The secret (symmetric) or PEM-encoded public key (asymmetric) file for verifying the token\'s signature.'
      },
      jwtExtractor: {
        type: 'string',
        enum: Object.keys(extractors),
        default: 'authBearer',
        description: 'The method to use to extract the JWT from the current HTTP Request'
      },
      jwtExtractorField: {
        type: 'string',
        description: 'An optional argument for the selected extractor'
      },
      audience: {
        type: 'string',
        description: 'If defined, the token audience (aud) will be verified against this value.'
      },
      issuer: {
        type: 'string',
        description: 'If defined the token issuer (iss) will be verified against this value'
      },
      checkCredentialExistence: {
        type: 'boolean',
        default: true,
        description: 'Value istructing the gateway whether verify the sub against the internal SOC'
      }
    },
    required: ['jwtExtractor', 'checkCredentialExistence'],
    oneOf: [{ required: ['secretOrPublicKey'] }, { required: ['secretOrPublicKeyFile'] }]
  }
};
