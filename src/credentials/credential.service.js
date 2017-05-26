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
        return true; // no scopes to insert
      }
      
      return credentialDao.insertScopes(newScopes)
      .then(res => !!res);
    })
    .catch(() => Promise.reject(new Error('failed to insert scope'))); // TODO: replace with server error
  }

  function removeScopes(scopes) {
    let _scopes = validateScopes(scopes)
    if (!_scopes) {
      return Promise.reject(new Error('invalid scopes')); // TODO: replace with validation error
    } else return credentialDao.removeScopes(_scopes)
    .then(function(removed) {
      return removed ? true : false;
    });
  }

  function existsScope(scope) {
    return scope ? credentialDao.existsScope(scope) : Promise.resolve(false);
  }

  function getAllScopes() {
    return credentialDao.getAllScopes();
  }

  function insertCredential(id, type, credentialDetails) {
    if (!id || typeof id !== 'string' || !type || !credentialDetails) {
      return Promise.reject(new Error('invalid credentials')); // TODO: replace with validation error
    }

    if (!config.credentials[type]) {
      return Promise.reject(new Error('invalid credential type')); // TODO: replace with validation error
    }

    return getCredential(id, type) // check if credential already exists
    .then((cred) => {
      let newCredential, credentialConfig;

      if (cred) {
        if (cred.isActive) {
          return Promise.reject(new Error('credential already exists and is active')); // TODO: replace with validation error
        } else return Promise.reject(new Error('credential already exists but it is inactive. activate credential instead.')); // TODO: replace with validation error
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
        .catch((err) => Promise.reject(new Error('failed to insert credential: ' + err.message))); // TODO: replace with server error
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
      return Promise.reject(new Error(`${credentialConfig.passwordKey} is required`)); // TODO: replace with validation error
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
      return Promise.reject(new Error('scopes are required')); // TODO: replace with validation error
    }

    if (credentialConfig.properties['scopes'].defaultValue) {
      return Promise.resolve(credentialConfig.properties['scopes'].defaultValue);
    }

    return Promise.resolve(null);
  }

  function getCredential(id, type, options) {
    if (!id || !type || typeof id !== 'string' || typeof type !== 'string') {
      return Promise.reject(new Error('invalid credential')); // TODO: replace with validation error
    }
    return credentialDao.getCredential(id, type)
    .then(credential => {
      if (!credential) {
        return null;
      }

      if (credential.scopes && credential.scopes.length > 0) {
        credential.scopes = JSON.parse(credential.scopes);
      }

      return (options && options.includePassword === true) ? credential : _.omit(credential, [ config.credentials[type].passwordKey ]);
    });
  }

  function deactivateCredential(id, type) {
    if (!id || !type) {
      return Promise.reject(new Error('invalid credential')); // TODO: replace with validation error
    }

    return getCredential(id, type) // verify credential exists
    .then((credential) => {
      if (credential) {
        return credentialDao.deactivateCredential(id, type)
        .then(() => true);
      } else return Promise.reject(new Error('credential does not exist')); // TODO: replace with validation error
    });
  }

  function activateCredential(id, type) {
    if (!id || !type) {
      return Promise.reject(new Error('invalid credential')); // TODO: replace with validation error
    }

    return getCredential(id, type) // verify credential exists
    .then((credential) => {
      if (credential) {
        return credentialDao.activateCredential(id, type)
        .then(() => true);
      } else return Promise.reject(new Error('credential does not exist')); // TODO: replace with validation error
    });
  }

  function updateCredential(id, type, properties) {
    return getCredential(id, type)
    .then((credential) => {
      if (!credential) {
        return Promise.reject(new Error('credential does not exist')); // TODO: replace with validation error
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
    .return(true);
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
    .return(true);
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
          return Promise.reject(new Error('credential property must be a string')); // TODO: replace with validation error
        }
        if (credentialConfig.properties[prop].isMutable !== false) {
          newCredentialProperties[prop] = credentialDetails[prop];
        }
      }
    }

    return Object.keys(newCredentialProperties).length > 0 ? Promise.resolve(newCredentialProperties) : Promise.resolve(null);
  }

  function validateNewScopes(scopes) {
    let _scopes = validateScopes(scopes);
    return !_scopes ? Promise.reject(new Error('invalid scopes')) : // TODO: replace with validation error
      Promise.all(_scopes.map(val => existsScope(val)))
      .then(res => {
        return res.every(val => !val) ? _scopes :
          Promise.reject(new Error('one or more scopes already exist')); // TODO: replace with validation error
      });
  }

  function validateExistingScopes(scopes) {
    let _scopes = validateScopes(scopes);
    return !_scopes ? Promise.reject(new Error('invalid scopes')) : // TODO: replace with validation error
      Promise.all(_scopes.map(val => existsScope(val)))
      .then(res => {
        return res.every(val => val) ? _scopes :
          Promise.reject(new Error('one or more scopes don\'t exist')); // TODO: replace with validation error
      });
  }

  function validateScopes(scopes) {
    let _scopes = Array.isArray(scopes) ? _.uniq(scopes) : [ scopes ];
    if (!_scopes || _scopes.some(val => typeof val !== 'string')) {
      return false;
    } else return _scopes;
  }

  function authenticate(id, password, type) {
    let credential;

    return getCredential(id, type, { includePassword: true })
    .then(_credential => {
      credential = _credential;
      return credential ? compareSaltAndHashed(password, credential[config.credentials[type]['passwordKey']]) : false;
    })
    .then(authenticated => {
      return authenticated ? true : false;
    })
    .catch(() => false);
  }

  function saltAndHash(password) {
    if (!password || typeof password !== 'string') {
      return Promise.reject(new Error('invalid arguments'));
    }
    return bcrypt.genSalt(config.bcrypt.saltRounds)
    .then(function(salt) {
      return bcrypt.hashAsync(password, salt);
    })
    .catch(() => Promise.reject(new Error('password hash failed'))); // TODO: replace with server error
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