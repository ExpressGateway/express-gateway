'use strict';

module.exports = {
  db: {
    redis: {
      host: 'localhost',
      port: 5555,
      users: {
        userHashPrefix: 'EG-USER',
        usernameSetPrefix: 'EG-USERNAME'
      },
      applications: {
        appHashPrefix: 'EG-APP',
        userAppsHashPrefix: 'EG-USER-APPS'
      },
      tokens: {
        tokenHashPrefix: 'EG-TOKEN',
        consumerTokensHashPrefix: 'EG-CONSUMER-TOKENS'
      },
      authorizationCodes: {
        codeHashPrefix: 'EG-AUTH-CODE'
      },
      credentials: {
        scopePrefix: 'EG-SCOPE',
        scopeCredentialPrefix: 'EG-SCOPE-CREDENTIAL',
        credentialPrefixes: {
          oauth: 'EG-OAUTH',
          basicAuth: 'EG-BASIC-AUTH'
        }
      }
    }
  },
  crypto: {
    cipherKey: 'sensitiveKey',
    algorithm: 'aes256',
    saltRounds: 10
  },
  access_tokens: {
    timeToExpiry: 7200000 // 2 hours
  },
  authorization_codes: {
    timeToExpiry: 300000 // 5 minutes
  }
};
