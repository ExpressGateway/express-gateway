'use strict';

let getCredentialService = require('./credentials/credential.service.js');
let getUserService = require('./consumers/user.service.js');
let getApplicationService = require('./consumers/user.service.js');
let getTokenService = require('./tokens/token.service.js');
let utils = require('./utils');
// let _ = require('lodash');

module.exports = function(config) {
  let credentials = getCredentialService(config);
  let users = getUserService(config);
  let applications = getApplicationService(config);
  let tokens = getTokenService(config);

  function authenticateCredential(id, password, type) {
    let consumer;

    return applications.get(id)
    .then(app => {
      if (app) {
        consumer = createApplicationObject(app);
        return;
      } 
      else return users.find(id)
      .then(user => {
        if (user) {
          consumer = createUserObject(user);
        }
        return;
      });
    })
    .then(() => {
      if (!consumer || !consumer.isActive) {
        return false;
      } else return credentials.getCredential(id, type, { includePassword: true })
        .then(_credential => {
          if (_credential) {
            return utils.compareSaltAndHashed(password, _credential[config.credentials[type]['passwordKey']])
            .then(authenticated => {
              return authenticated ? consumer : false;
            })
          }  else return false;
        });
    });
  }

  function authenticateToken(token) {
    let [ tokenId, tokenPassword ] = token.split('|');

    return tokens.get(tokenId)
    .then(tokenObj => {
      if (tokenObj && tokenObj.tokenDecrypted) {
        return tokenObj.tokenDecrypted === tokenPassword ? tokenObj : false;
      } else return false;
    });
  }

  function authorizeToken(_token, authType, scopes) {
    if (!scopes || scopes.length === 0) {
      return true;
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
  }

  function authorizeCredential(id, password, authType, scopes) {
    if (!scopes || !scopes.length) {
      return true;
    }

    return credentials.getCredential(id, authType)
    .then(_credential => {
      if (_credential) {
        if (!_credential.scopes) {
          return false;
        }
        return scopes.every(scope => _credential.scopes.indexOf(scope) !== -1);
      }
    });
  }

  function createUserObject(user) {
    return {
      type     : 'user',
      id       : user.id,
      user     : user,
      username : user.username,
      isActive : user.isActive
    };
  }

  function createApplicationObject(app) {
    return {
      type        : 'application',
      id          : app.id,
      application : app,
      userId      : app.userId,
      isActive    : app.isActive
    };
  }

  return {
    authenticateToken,
    authenticateCredential,
    authorizeToken,
    authorizeCredential
  }
}