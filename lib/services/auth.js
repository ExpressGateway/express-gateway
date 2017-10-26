'use strict';

const credentials = require('./credentials/credential.service.js');
const users = require('./consumers/user.service.js');
const applications = require('./consumers/application.service.js');
const tokens = require('./tokens/token.service.js');
const utils = require('./utils');
const config = require('../config');

const s = {};

s.authenticateCredential = function (id, password, type) {
  if (!id || !password || !type) {
    return Promise.resolve(false);
  }
  if (type === 'key-auth') {
    return credentials.getCredential(id, type, { includePassword: true })
      .then(credential => {
        if (!credential || !credential.isActive || credential.keySecret !== password) {
          return false;
        }
        return Promise.all([this.validateConsumer(credential.consumerId), id]);
      });
  }
  return this.validateConsumer(id)
    .then((consumer) => {
      if (!consumer) {
        return false;
      }

      return Promise.all([consumer, credentials.getCredential(consumer.username || consumer.id, type, { includePassword: true })]);
    })
    .then(([consumer, credential]) => {
      if (!credential || !credential.isActive) {
        return false;
      }

      return Promise.all([
        consumer,
        credential,
        utils.compareSaltAndHashed(password, credential[config.models.credentials[type]['passwordKey']])
      ]);
    })
    .then((result) => {
      if (!result) {
        return false;
      }
      const [consumer] = result;
      return [consumer, consumer.id];
    });
};

s.authenticateToken = function (token) {
  let tokenObj;
  const tokenPassword = token.split('|')[1];

  return tokens.get(token)
    .then(_tokenObj => {
      tokenObj = _tokenObj;

      if (!tokenObj) {
        return null;
      }

      return this.validateConsumer(tokenObj.consumerId);
    })
    .then(consumer => {
      if (!consumer || !consumer.isActive) {
        return false;
      } else return tokenObj.tokenDecrypted === tokenPassword ? { token: tokenObj, consumer } : false;
    });
};

s.authorizeToken = function (_token, authType, scopes) {
  if (!scopes || scopes.length === 0) {
    return Promise.resolve(true);
  }

  scopes = Array.isArray(scopes) ? scopes : [scopes];

  return tokens.get(_token)
    .then(token => {
      if (!token) {
        return false;
      }

      if (scopes && scopes.length && !token.scopes) {
        return false;
      }

      return scopes.every(scope => token.scopes.indexOf(scope) !== -1);
    });
};

s.authorizeCredential = function (id, authType, scopes) {
  if (!scopes || !scopes.length) {
    return Promise.resolve(true);
  }

  return credentials.getCredential(id, authType)
    .then(credential => {
      if (credential) {
        if (!credential.scopes) {
          return false;
        }
        return scopes.every(scope => credential.scopes.indexOf(scope) !== -1);
      }
    });
};

s.validateConsumer = function (id, options = {}) {
  return applications.get(id)
    .then(app => {
      if (app && app.isActive) {
        return createApplicationObject(app);
      }

      return users.get(id);
    }).then(_user => {
      if (_user && _user.isActive) {
        return createUserObject(_user);
      }

      return users.find(id);
    }).then(user => {
      if (user && user.isActive) {
        return createUserObject(user);
      }
      return null;
    });
};

function createUserObject (user) {
  return Object.assign({ type: 'user' }, user);
}

function createApplicationObject (app) {
  return Object.assign({ type: 'application' }, app);
}

module.exports = s;
