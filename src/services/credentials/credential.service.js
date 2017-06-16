'use strict';

let credentialDao = require('./credential.dao.js');
let _ = require('lodash');
let Promise = require('bluebird');
let utils = require('../utils');
let uuid = require('node-uuid');
let modelConfig = require('../../config/models/credentials');

let s = {};

s.insertScopes = function (scopes) {
  return validateNewScopes(scopes)
    .then(newScopes => {
      if (!newScopes) {
        return true; // no scopes to insert
      }

      return credentialDao.insertScopes(newScopes)
        .then(res => !!res);
    })
    .catch(() => Promise.reject(new Error('failed to insert scope'))); // TODO: replace with server error
};

s.removeScopes = function (scopes) {
  let _scopes = validateScopes(scopes);
  if (!_scopes) {
    return Promise.reject(new Error('invalid scopes')); // TODO: replace with validation error
  } else {
    return credentialDao.removeScopes(_scopes)
    .then(function (removed) {
      return !!removed;
    });
  }
};

s.existsScope = function (scope) {
  return scope ? credentialDao.existsScope(scope) : Promise.resolve(false);
};

s.getAllScopes = function () {
  return credentialDao.getAllScopes();
};

s.insertCredential = function (id, type, credentialDetails) {
  credentialDetails = credentialDetails || {};

  if (!id || typeof id !== 'string' || !type) {
    return Promise.reject(new Error('invalid credentials')); // TODO: replace with validation error
  }

  if (!modelConfig[type]) {
    return Promise.reject(new Error('invalid credential type')); // TODO: replace with validation error
  }

  return this.getCredential(id, type) // check if credential already exists
    .then((cred) => {
      let newCredential, credentialConfig;

      if (cred) {
        if (cred.isActive) {
          return Promise.reject(new Error('credential already exists and is active')); // TODO: replace with validation error
        } else return Promise.reject(new Error('credential already exists but it is inactive. activate credential instead.')); // TODO: replace with validation error
      }

      credentialConfig = modelConfig[type];
      newCredential = { isActive: 'true' };

      return Promise.all([validateNewCredentialScopes(credentialConfig, credentialDetails),
        validateAndHashPassword(credentialConfig, credentialDetails),
        validateNewCredentialProperties(credentialConfig, _.omit(credentialDetails, ['scopes']))
      ])
        .then(([scopes, { hash, password }, credentialProps]) => {
          let associateCredentialWithScopesPromise;
          if (scopes) {
            newCredential['scopes'] = JSON.stringify(scopes);
            associateCredentialWithScopesPromise = credentialDao.associateCredentialWithScopes(id, type, scopes);
          } else associateCredentialWithScopesPromise = Promise.resolve(null);

          newCredential[credentialConfig.passwordKey] = hash;
          Object.assign(newCredential, credentialProps);

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
};

s.getCredential = function (id, type, options) {
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

      return (options && options.includePassword === true) ? credential : _.omit(credential, [modelConfig[type].passwordKey]);
    });
};

s.deactivateCredential = function (id, type) {
  if (!id || !type) {
    return Promise.reject(new Error('invalid credential')); // TODO: replace with validation error
  }

  return this.getCredential(id, type) // verify credential exists
    .then((credential) => {
      if (credential) {
        return credentialDao.deactivateCredential(id, type)
          .then(() => true);
      } else return Promise.reject(new Error('credential does not exist')); // TODO: replace with validation error
    });
};

s.activateCredential = function (id, type) {
  if (!id || !type) {
    return Promise.reject(new Error('invalid credential')); // TODO: replace with validation error
  }

  return this.getCredential(id, type) // verify credential exists
    .then((credential) => {
      if (credential) {
        return credentialDao.activateCredential(id, type)
          .then(() => true);
      } else return Promise.reject(new Error('credential does not exist')); // TODO: replace with validation error
    });
};

s.updateCredential = function (id, type, properties) {
  return this.getCredential(id, type)
    .then((credential) => {
      if (!credential) {
        return Promise.reject(new Error('credential does not exist')); // TODO: replace with validation error
      }
      return validateUpdatedCredentialProperties(type, properties);
    })
    .then((credentialProperties) => {
      return credentialDao.updateCredential(id, type, credentialProperties);
    });
};

s.removeCredential = function (id, type) {
  if (!id || !type) {
    return Promise.reject(new Error('invalid credential')); // TODO: replace with validation error
  }

  return credentialDao.removeCredential(id, type)
    .return(true);
};

s.removeAllCredentials = function (id) {
  if (!id) {
    return Promise.reject(new Error('invalid credential')); // TODO: replace with validation error
  }
  return credentialDao.removeAllCredentials(id)
    .then(() => true);
};

s.addScopesToCredential = function (id, type, scopes) {
  return Promise.all([validateExistingScopes(scopes), this.getCredential(id, type)])
    .then(([_scopes, credential]) => {
      let existingScopes = credential.scopes ? (Array.isArray(credential.scopes) ? credential.scopes : [credential.scopes]) : [];
      let newScopes = _.uniq(_scopes.concat(existingScopes));
      return Promise.all([credentialDao.updateCredential(id, type, { scopes: JSON.stringify(newScopes) }),
        credentialDao.associateCredentialWithScopes(id, type, _scopes)
      ]);
    })
    .then(() => true);
};

s.removeScopesFromCredential = function (id, type, scopes) {
  return Promise.all([validateScopes(scopes), this.getCredential(id, type)])
    .then(([_scopes, credential]) => {
      let existingScopes = credential.scopes ? (Array.isArray(credential.scopes) ? credential.scopes : [credential.scopes]) : [];
      let newScopes = existingScopes.filter(val => _scopes.indexOf(val) === -1);
      return Promise.all([credentialDao.updateCredential(id, type, { scopes: JSON.stringify(newScopes) }),
        credentialDao.dissociateCredentialFromScopes(id, type, _scopes)
      ]);
    })
    .return(true);
};

function validateAndHashPassword (credentialConfig, credentialDetails) {
  let password;

  if (credentialDetails[credentialConfig.passwordKey]) {
    return utils.saltAndHash(credentialDetails[credentialConfig.passwordKey])
      .then(hash => {
        return { hash };
      });
  }

  if (!credentialConfig.autoGeneratePassword) {
    return Promise.reject(new Error(`${credentialConfig.passwordKey} is required`)); // TODO: replace with validation error
  }

  password = uuid.v4();

  return utils.saltAndHash(password)
    .then((hash) => {
      return { hash, password };
    });
}

function validateNewCredentialScopes (credentialConfig, credentialDetails) {
  if (!credentialConfig.properties || !credentialConfig.properties['scopes']) {
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

// This function validates all user defined properties, excluding scopes
function validateNewCredentialProperties (credentialConfig, credentialDetails) {
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
function validateUpdatedCredentialProperties (type, credentialDetails) {
  let newCredentialProperties = {};
  let credentialConfig = modelConfig[type];

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

function validateNewScopes (scopes) {
  let _scopes = validateScopes(scopes);
  return !_scopes ? Promise.reject(new Error('invalid scopes')) // TODO: replace with validation error
    : Promise.all(_scopes.map(val => s.existsScope(val)))
    .then(res => {
      return res.every(val => !val) ? _scopes
        : Promise.reject(new Error('one or more scopes already exist')); // TODO: replace with validation error
    });
}

function validateExistingScopes (scopes) {
  let _scopes = validateScopes(scopes);
  return !_scopes ? Promise.reject(new Error('invalid scopes')) // TODO: replace with validation error
    : Promise.all(_scopes.map(val => s.existsScope(val)))
    .then(res => {
      return res.every(val => val) ? _scopes
        : Promise.reject(new Error('one or more scopes don\'t exist')); // TODO: replace with validation error
    });
}

function validateScopes (scopes) {
  let _scopes = Array.isArray(scopes) ? _.uniq(scopes) : [scopes];
  if (!_scopes || _scopes.some(val => typeof val !== 'string')) {
    return false;
  } else return _scopes;
}

module.exports = s;
