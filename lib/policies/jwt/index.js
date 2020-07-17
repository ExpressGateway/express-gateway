const extractors = require('./extractors');

module.exports = {
  policy: require('./jwt'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/jwt.json',
    type: 'object',
    properties: {
      secretOrPublicKey: {
        type: 'string',
        description: 'The secret (symmetric) or PEM-encoded public key (asymmetric) for verifying the token\'s signature.',
        examples: ['secretString', 'PEMCertificate']
      },
      secretOrPublicKeyFile: {
        type: 'string',
        description: 'The secret (symmetric) or PEM-encoded public key (asymmetric) file for verifying the token\'s signature.',
        examples: ['./path/to/cert.pem']
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
      },
      algorithms: {
        type: 'array',
        items: { type: 'string', enum: ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'] },
        description: 'If defined, limits valid jwts to specified algorithms'
      }
    },
    required: ['jwtExtractor', 'checkCredentialExistence'],
    oneOf: [{ required: ['secretOrPublicKey'] }, { required: ['secretOrPublicKeyFile'] }]
  }
};
