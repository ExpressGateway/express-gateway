const extractors = require('./extractors');

module.exports = {
  policy: require('./jwt'),
  schema: {
    $id: 'http://express-gateway.io/schemas/jwt.json',
    type: 'object',
    properties: {
      secretOrPubKey: {
        type: 'string'
      },
      secretOrPubKeyFile: {
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
    oneOf: [{ required: ['secretOrPubKey'] }, { required: ['secretOrPubKeyFile'] }]
  }
};
