'use strict'

module.exports = {
  redis: {
    host: 'localhost',
    port: '5555'
  },
  users: {
    redis: {
      userHashPrefix: 'TEST-ENV-USER',
      usernameSetPrefix: 'TEST-ENV-USERNAME'
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
      appHashPrefix: 'TEST-ENV-APP',
      userAppsHashPrefix: 'TEST-ENV-USER-APPS'
    },
    properties: {
      name: { isRequired: true, isMutable: true },
      redirectUri: { isRequired: false, isMutable: true }
    }
  },
  tokens: {
    redis: {
      tokenHashPrefix: 'TEST-ENV-TOKEN',
      consumerTokensHashPrefix: 'TEST-ENV-CONSUMER-TOKENS'
    },
    timeToExpiry: 7200000 // 2 hours
  },
  credentials: {
    redis: {
      scopePrefix: 'TEST-ENV-SCOPE',
      scopeCredentialPrefix: 'TEST-ENV-SCOPE-CREDENTIAL', // 'SCOPE-CREDENTIAL:someScope': { cred100: true, cred200: true }
      credentialPrefixes: {
        oauth: 'TEST-ENV-OAUTH',
        basicAuth: 'TEST-ENV-BASIC-AUTH'
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