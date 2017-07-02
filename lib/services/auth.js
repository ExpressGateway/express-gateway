'use strict';

let credentials = require('./credentials/credential.service.js');
let users = require('./consumers/user.service.js');
let applications = require('./consumers/application.service.js');
let tokens = require('./tokens/token.service.js');
let utils = require('./utils');
let config = require('../config');

let s = {};

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
      return this.validateConsumer(credential.consumerId, {checkUsername: true});
    });
  }

  return this.validateConsumer(id, { checkUsername: true })
  .then((consumer) => {
    if (!consumer) {
      return false;
    }

    return credentials.getCredential(id, type, { includePassword: true })
    .then(credential => {
      if (!credential || !credential.isActive) {
        return false;
      }

      return utils.compareSaltAndHashed(password, credential[config.models.credentials[type]['passwordKey']])
      .then(authenticated => {
        if (!authenticated) {
          return false;
        }

        return consumer;
      });
    });
  });
};

s.authenticateToken = function (token) {
  let tokenObj;
  let tokenPassword = token.split('|')[1];

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

  scopes = Array.isArray(scopes) ? scopes : [ scopes ];

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

s.validateConsumer = function (id, options) {
  return applications.get(id)
  .then(app => {
    if (app && app.isActive) {
      return createApplicationObject(app);
    }

    return users.get(id)
    .then(_user => {
      if (_user && _user.isActive) {
        return createUserObject(_user);
      }

      if (options.checkUsername) {
        let username = id;
        return users.find(username)
        .then(user => {
          if (user && user.isActive) {
            return createUserObject(user);
          } else return null;
        });
      }

      return null;
    });
  });
};

function createUserObject (user) {
  return Object.assign({ type: 'user' }, user);
}

function createApplicationObject (app) {
  return Object.assign({ type: 'application' }, app);
}

module.exports = s;
