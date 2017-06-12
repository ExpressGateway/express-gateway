'use strict';

let getCredentialService = require('./credentials/credential.service.js');
let getUserService = require('./consumers/user.service.js');
let getApplicationService = require('./consumers/application.service.js');
let getTokenService = require('./tokens/token.service.js');
let utils = require('./utils');

module.exports = function(config) {
  let credentials = getCredentialService(config);
  let users = getUserService(config);
  let applications = getApplicationService(config);
  let tokens = getTokenService(config);

  function authenticateCredential(id, password, type) {
    if (!id || !password || !type) {
      return false;
    }
    return validateConsumer(id)
    .then((consumer) => {
      if (!consumer) {
        return false;
      } else return credentials.getCredential(id, type, { includePassword: true })
        .then(_credential => {
          if (_credential && _credential.isActive) {
            return utils.compareSaltAndHashed(password, _credential[config.credentials.types[type]['passwordKey']])
            .then(authenticated => {
              return authenticated ? consumer : false;
            })
          } else return false;
        });
    });
  }

  function authenticateToken(token) {
    let tokenObj;
    let tokenPassword = token.split('|')[1];

    return tokens.get(token)
    .then(_tokenObj => {
      tokenObj = _tokenObj;

      if (!tokenObj) {
        return null;
      }

      if (tokenObj.username) {
        return users.find(tokenObj.username);
      } else return applications.get(tokenObj.applicationId);
    })
    .then(consumer => {
      if (!consumer || !consumer.isActive) {
        return false;
      } else return tokenObj.tokenDecrypted === tokenPassword ? tokenObj : false;
    })
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

  function authorizeCredential(id, authType, scopes) {
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

  function validateConsumer(id) {
    return applications.get(id)
    .then(app => {
      if (app) {
        if (!app.isActive) {
          return null;
        }
        return createApplicationObject(app);
      } else return users.find(id)
        .then(user => {
          if (user) {
            if (!user.isActive) {
              return null;
            }
            return createUserObject(user);
          } else return users.get(id)
            .then(_user => {
              if (_user) {
                if (!_user.isActive) {
                  return null;
                }
                return createUserObject(_user);
              } else return null;
            });
        });
    });
  }

  function createUserObject(user) {
    return Object.assign({ type: 'user' }, user);
  }

  function createApplicationObject(app) {
    return Object.assign({ type: 'application' }, app);
  }

  return {
    authenticateToken,
    authenticateCredential,
    authorizeToken,
    validateConsumer,
    authorizeCredential
  }
}