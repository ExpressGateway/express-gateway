const extractors = require('./extractors');

module.exports = {
  policy: require('./jwt'),
  schema: {
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
      }
    },
    required: ['jwtExtractor'],
    oneOf: [{ required: ['secretOrPubKey'] }, { required: ['secretOrPubKeyFile'] }]
  }
};
