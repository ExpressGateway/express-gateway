'use strict';

let getCredentialDao = require('./credential.dao.js');
let _ = require('lodash');
let Promise = require('bluebird');
// let utils = require('../utils');
let uuid = require('node-uuid');
let bcrypt = Promise.promisifyAll(require('bcrypt'));
let credentialService, credentialDao;

module.exports = function(config) {
  credentialDao = getCredentialDao(config);

  function insertScopes(scopes) {
    return validateNewScopes(scopes)
    .then(newScopes => {
      if (!newScopes) {
        return Promise.reject(new Error('invalid scopes. scopes should be unique strings'));
      }
      
      return credentialDao.insertScopes(newScopes)
      .then(res => !!res);
    })
    .catch(() => Promise.reject(new Error('failed to insert scope')));
  }

  function removeScopes(scopes) {
    return validateScopes(scopes)
    .then(_scopes => {
      return credentialDao.removeScopes(_scopes)
      .then(function(removed) {
        return removed ? true : Promise.reject(new Error('failed to remove scopes'));
      });
    });
  }

  function existsScope(scope) {
    return scope ? credentialDao.existsScope(scope) : Promise.resolve(null);
  }

  function getAllScopes() {
    return credentialDao.getAllScopes();
  }

  function insertCredential(id, type, credentialDetails) {
    if (!id || typeof id !== 'string' || !type || !credentialDetails) {
      return Promise.reject(new Error('invalid credentials'));
    }

    if (!config.credentials[type]) {
      return Promise.reject(new Error('invalid credential type'));
    }

    return getCredential(id, type) // check if credential already exists
    .then((cred) => {
      let newCredential, credentialConfig;

      if (cred) {
        if (cred.isActive) {
          return Promise.reject(new Error('credential already exists and is active'));
        } else return Promise.reject(new Error('credential already exists but it is inactive. activate credential instead.'));
      }

      credentialConfig = config.credentials[type];
      newCredential = { isActive: true };

      return Promise.all([validateNewCredentialScopes(credentialConfig, credentialDetails),
                          validateAndHashPassword(credentialConfig, credentialDetails),
                          validateNewCredentialproperties(credentialConfig, _.omit(credentialDetails, ['scopes']))
                        ])
      .then(([ scopes, { hash, password }, credentialProps ]) => {
        let associateCredentialWithScopesPromise;
        if (scopes) {
          newCredential['scopes'] = JSON.stringify(scopes);
          associateCredentialWithScopesPromise = credentialDao.associateCredentialWithScopes(id, type, scopes);
        } else associateCredentialWithScopesPromise = Promise.resolve(null);

        newCredential[credentialConfig.passwordKey] = hash;
        Object.assign(newCredential, credentialProps)

        return Promise.all([credentialDao.insertCredential(id, type, newCredential),
                            associateCredentialWithScopesPromise
                          ])
        .then(() => {
          let credential = _.omit(newCredential, [credentialConfig.passwordKey]);
          credential['id'] = id;
          if (password) {
            credential[credentialConfig.passwordKey] = password;
          }
          if (credential.scopes && credential.scopes.length > 0) {
            credential.scopes = JSON.parse(credential.scopes);
          }
          return credential;
        })
        .catch((err) => Promise.reject(new Error('failed to insert credential: ' + err.message)));
      });
    });
  }

  // Helper method to insertCredentials
  function validateAndHashPassword(credentialConfig, credentialDetails) {
    let password;

    if (credentialDetails[credentialConfig.passwordKey]) {
      return saltAndHash(credentialDetails[credentialConfig.passwordKey])
      .then(hash => {
        return { hash };
      });
    }

    if (!credentialConfig.autoGeneratePassword) {
      return Promise.reject(new Error(`${credentialConfig.passwordKey} is required`));
    }

    password = uuid.v4();

    return saltAndHash(password)
    .then((hash) => {
      return { hash, password }
    });
  }

  // Helper method to insertCredentials
  function validateNewCredentialScopes(credentialConfig, credentialDetails) {
    if (!credentialConfig.properties['scopes']) {
      return Promise.resolve(null);
    }

    if (credentialDetails['scopes']) {
      return validateExistingScopes(credentialDetails['scopes']);
    }

    if (credentialConfig.properties['scopes'].isRequired) {
      return Promise.reject(new Error('scopes are required'));
    }

    if (credentialConfig.properties['scopes'].defaultValue) {
      return Promise.resolve(credentialConfig.properties['scopes'].defaultValue);
    }

    return Promise.resolve(null);
  }

  function getCredential(id, type, getPassword) {
    if (!id || !type || typeof id !== 'string' || typeof type !== 'string') {
      return Promise.reject(new Error('invalid credential'));
    }
    return credentialDao.getCredential(id, type)
    .then(credential => {
      if (!credential) {
        return null;
      }

      if (credential.scopes && credential.scopes.length > 0) {
        credential.scopes = JSON.parse(credential.scopes);
      }

      return getPassword === true ? credential : _.omit(credential, [ config.credentials[type].passwordKey ]);
    });
  }

  function deactivateCredential(id, type) {
    if (!id || !type) {
      return Promise.reject(new Error('invalid credential'));
    }

    return getCredential(id, type) // verify credential exists
    .then((credential) => {
      if (credential) {
        return credentialDao.deactivateCredential(id, type)
        .then(() => true);
      } else return Promise.reject(new Error('credential does not exist'));
    });
  }

  function activateCredential(id, type) {
    if (!id || !type) {
      return Promise.reject(new Error('invalid credential'));
    }

    return getCredential(id, type) // verify credential exists
    .then((credential) => {
      if (credential) {
        return credentialDao.activateCredential(id, type)
        .then(() => true);
      } else return Promise.reject(new Error('credential does not exist'));
    });
  }

  function updateCredential(id, type, properties) {
    return getCredential(id, type)
    .then((credential) => {
      if (!credential) {
        return Promise.reject(new Error('credential does not exist'));
      }
      return validateUpdatedCredentialproperties(type, properties);
    })
    .then((credentialProperties) => {
      return credentialDao.updateCredential(id, type, credentialProperties);
    });
  }

  function addScopesToCredential(id, type, scopes) {
    return Promise.all([validateExistingScopes(scopes), getCredential(id, type)])
    .then(([ _scopes, credential ]) => {
      let existingScopes = credential.scopes ? (Array.isArray(credential.scopes) ? credential.scopes : [ credential.scopes ]) : [];
      let newScopes = _.uniq(_scopes.concat(existingScopes));
      return Promise.all([credentialDao.updateCredential(id, type, { scopes: JSON.stringify(newScopes) }),
                          credentialDao.associateCredentialWithScopes(id, type, _scopes)
                        ]);
    })
    .then(() => true)
  }

  function removeScopesFromCredential(id, type, scopes) {
    return Promise.all([validateScopes(scopes), getCredential(id, type)])
    .then(([ _scopes, credential ]) => {
      let existingScopes = credential.scopes ? (Array.isArray(credential.scopes) ? credential.scopes : [ credential.scopes ]) : [];
      let newScopes = existingScopes.filter(val => _scopes.indexOf(val) === -1);
      return Promise.all([credentialDao.updateCredential(id, type, { scopes: JSON.stringify(newScopes) }),
                          credentialDao.dissociateCredentialFromScopes(id, type, _scopes)
                        ]);
    })
    .then(() => true)
    .catch(() => Promise.reject('failed to remove scopes from credential'));
  }

  // This function validates all user defined properties, excluding scopes
  function validateNewCredentialproperties(credentialConfig, credentialDetails) {
    let newCredentialProperties = {};

    for (let prop in _.omit(credentialConfig.properties, ['scopes'])) {
      let descriptor = credentialConfig.properties[prop];
      if (!credentialDetails[prop]) {
        if (descriptor.isRequired) {
          return Promise.reject(new Error(`${prop} is required`));
        }
        if (descriptor.defaultValue) {
          newCredentialProperties[prop] = descriptor.defaultValue;
        }
      } else newCredentialProperties[prop] = credentialDetails[prop];
    }

    return Object.keys(newCredentialProperties).length > 0 ? Promise.resolve(newCredentialProperties) : Promise.resolve(null);
  }

  // This function validates all user defined properties, excluding scopes
  function validateUpdatedCredentialproperties(type, credentialDetails) {
    let newCredentialProperties = {};
    let credentialConfig = config.credentials[type];

    for (let prop in _.omit(credentialConfig.properties, ['scopes'])) {
      if (credentialDetails[prop]) {
        if (typeof credentialDetails[prop] !== 'string') {
          return Promise.reject(new Error('credential property must be a string'));
        }
        if (credentialConfig.properties[prop].isMutable !== false) {
          newCredentialProperties[prop] = credentialDetails[prop];
        }
      }
    }

    return Object.keys(newCredentialProperties).length > 0 ? Promise.resolve(newCredentialProperties) : Promise.resolve(null);
  }

  function validateNewScopes(scopes) {
    let _scopes;
    return validateScopes(scopes)
    .then(newScopes => {
      _scopes = newScopes;
      return Promise.all(_scopes.map(val => existsScope(val)))
    })
    .then(res => res.every(val => !val))
    .then(res => {
      return res ? _scopes : Promise.reject(new Error('one or more scopes already exist'));
    })
    .catch(() => Promise.reject(new Error('invalid scopes')));
  }

  function validateExistingScopes(scopes) {
    let _scopes;
    return validateScopes(scopes)
    .then(newScopes => {
      _scopes = newScopes;
      return Promise.all(_scopes.map(val => existsScope(val)))
    })
    .then(res => res.every(val => val))
    .then(res => {
      return res ? _scopes : Promise.reject(new Error('invalid scopes'));
    })
    .catch(() => Promise.reject(new Error('invalid scopes')));
  }

  function validateScopes(scopes) {
    let _scopes = Array.isArray(scopes) ? _.uniq(scopes) : [ scopes ];
    if (!_scopes || _scopes.some(val => typeof val !== 'string')) {
      return Promise.reject(new Error('invalid scopes'));
    } else return Promise.resolve(_scopes);
  }

  function authenticate(id, password, type) {
    let credential;

    return getCredential(id, type, true)
    .then(_credential => {
      credential = _credential;
      return credential ? compareSaltAndHashed(password, credential[config.credentials[type]['passwordKey']]) : false;
    })
    .then(authenticated => {
      return authenticated ? true : false;
    });
  }

  function saltAndHash(password) {
    if (!password || typeof password !== 'string') {
      return Promise.reject(new Error('invalid arguments'));
    }
    return bcrypt.genSalt(config.bcrypt.saltRounds)
    .then(function(salt) {
      return bcrypt.hashAsync(password, salt);
    })
    .catch(() => Promise.reject(new Error('password hash failed')));
  }

  function compareSaltAndHashed(password, hash) {
    if (!password || !hash) {
      return null;
    }
    return bcrypt.compareAsync(password, hash);
  }

  credentialService = {
    insertScopes,
    removeScopes,
    existsScope,
    getAllScopes,
    insertCredential,
    getCredential,
    deactivateCredential,
    activateCredential,
    addScopesToCredential,
    removeScopesFromCredential,
    updateCredential,
    authenticate
  };

  return credentialService;
}