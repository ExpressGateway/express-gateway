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
    properties: {
      scopes: { isRequired: false }
    }
  },
  oauth2: {
    passwordKey: 'secret',
    autoGeneratePassword: true,
    properties: {
      scopes: { isRequired: false }
    }
  }
};
