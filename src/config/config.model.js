'use strict'

module.exports = {
  redis: {
    host: 'localhost',
    port: '5555'
  },
  users: {
    redis: {
      userHashPrefix: 'EG-USER',
      usernameSetPrefix: 'EG-USERNAME'
    },
    usernameMaxLength: 15,
    usernameMinLength: 3,
    properties: {
      firstname: { isRequired: true, isMutable: true },
      lastname: { isRequired: true, isMutable: true },
      email: { isRequired: false, isMutable: true },
      redirectUri: { isRequired: false, isMutable: true }
    }
  },
  crypto: {
    cipherKey: 'sensitiveKey',
    algorithm: 'aes256'
  },
  bcrypt: {
    saltRounds: 10
  },
  applications: {
    redis: {
      appHashPrefix: 'EG-APP',
      userAppsHashPrefix: 'EG-USER-APPS'
    },
    properties: {
      name: { isRequired: true, isMutable: true },
      redirectUri: { isRequired: false, isMutable: true }
    }
  },
  tokens: {
    redis: {
      tokenHashPrefix: 'EG-TOKEN',
      consumerTokensHashPrefix: 'EG-CONSUMER-TOKENS'
    },
    timeToExpiry: 7200000 // 2 hours
  },
  authorizationCodes: {
    redis: {
      codeHashPrefix: 'EG-AUTH-CODE',
    },
    timeToExpiry: 300000 // 5 minutes
  },
  credentials: {
    redis: {
      scopePrefix: 'EG-SCOPE',
      scopeCredentialPrefix: 'EG-SCOPE-CREDENTIAL', // 'SCOPE-CREDENTIAL:someScope': { cred100: true, cred200: true }
      credentialPrefixes: {
        oauth: 'EG-OAUTH',
        basicAuth: 'EG-BASIC-AUTH'
      }
    },
    types: {
      basicAuth: {
        /* passwordKey is required for all credentials. 
         * Usually it's just 'password' or 'secret', but users can define it themselves 
         * In the case below, passwordKey is 'password'. So, when defining a credential, 
         * 'password' must be supplied as a parameter
         */
        passwordKey: 'password',
        autoGeneratePassword: true, // If password is not supplied, it will auto-generate a uuid as password
        properties: { // additional properties part of the credentials object
          scopes:   { isRequired: true },
        }
      },
      oauth: {
        passwordKey: 'secret',
        autoGeneratePassword: true,
        properties: { 
          scopes: { isRequired: false }
        }
      }
    }
  }
}