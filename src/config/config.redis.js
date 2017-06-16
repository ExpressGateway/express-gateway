'use strict';

module.exports = {
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
};
