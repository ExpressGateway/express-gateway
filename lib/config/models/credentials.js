'use strict';

module.exports = {
  'basic-auth': {
    passwordKey: 'password',
    autoGeneratePassword: true,
    properties: {
      scopes: { isRequired: false }
    }
  },
  'key-auth': {
    apiKeyHeader: 'authorization',
    apiKeyField: 'apikey',
    properties: {
      scopes: { isRequired: false }
    }
  },
  oauth: {
    passwordKey: 'secret',
    autoGeneratePassword: true,
    properties: {
      scopes: { isRequired: false }
    }
  }
};
