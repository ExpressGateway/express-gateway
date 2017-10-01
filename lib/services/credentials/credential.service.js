'use strict';
const credentialDao = require('./credential.dao.js');
const _ = require('lodash');
const utils = require('../utils');
const uuidv4 = require('uuid/v4');
const config = require('../../config');
const uuid62 = require('uuid-base62'); // special format for uuid, url friendly base62 encoding

const s = {};

s.insertScopes = function (scopes) {
  return validateNewScopes(scopes)
    .then(newScopes => {
      if (!newScopes) {
        return true; // no scopes to insert
      }

      return credentialDao.insertScopes(newScopes)
        .then(res => !!res);
    })
    .catch((err) => Promise.reject(err)); // TODO: replace with server error
};

s.removeScopes = function (scopes) {
  const _scopes = validateScopes(scopes);
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

  if (!config.models.credentials[type]) {
    return Promise.reject(new Error('invalid credential type:' + type)); // TODO: replace with validation error
  }

  return this.getCredential(id, type) // check if credential already exists
    .then((cred) => {
      if (cred) {
        if (cred.isActive) {
          return Promise.reject(new Error('credential already exists and is active')); // TODO: replace with validation error
        } else return Promise.reject(new Error('credential already exists but it is inactive. activate credential instead.')); // TODO: replace with validation error
      }

      const credentialConfig = config.models.credentials[type];
      const newCredential = { isActive: 'true' };
      utils.appendCreatedAt(newCredential);
      utils.appendUpdatedAt(newCredential);

      if (type === 'key-auth') { // TODO: if/else is not a good approach, new way TBD
        return Promise.all([validateNewCredentialScopes(credentialConfig, credentialDetails),
          validateNewCredentialProperties(credentialConfig, _.omit(credentialDetails, ['scopes']))
        ]).then(([scopes, credentialProps]) => {
          Object.assign(newCredential, credentialProps);
          newCredential.keyId = uuid62.v4();
          newCredential.keySecret = uuid62.v4();
          newCredential.scopes = JSON.stringify(scopes);
          newCredential.consumerId = id;

          return Promise.all([
            credentialDao.insertCredential(newCredential.keyId, type, newCredential),
            credentialDao.associateCredentialWithScopes(id, type, scopes)
          ]).then(() => {
            if (newCredential.scopes && newCredential.scopes.length > 0) {
              newCredential.scopes = JSON.parse(newCredential.scopes);
            }

            if (typeof newCredential.isActive === 'string') {
              newCredential.isActive = newCredential.isActive === 'true';
            }
            return newCredential;
          });
        });
      }

      return Promise.all([validateNewCredentialScopes(credentialConfig, credentialDetails),
        validateAndHashPassword(credentialConfig, credentialDetails),
        validateNewCredentialProperties(credentialConfig, _.omit(credentialDetails, ['scopes']))
      ])
        .then(([scopes, { hash, password }, credentialProps]) => {
          if (scopes) {
            newCredential['scopes'] = JSON.stringify(scopes);
          }
          newCredential[credentialConfig.passwordKey] = hash;
          Object.assign(newCredential, credentialProps);

          return Promise.all([
            credentialDao.insertCredential(id, type, newCredential),
            credentialDao.associateCredentialWithScopes(id, type, scopes)
          ])
            .then(() => {
              const credential = _.omit(newCredential, [credentialConfig.passwordKey]);
              credential['id'] = id;
              if (password) {
                credential[credentialConfig.passwordKey] = password;
              }
              if (credential.scopes && credential.scopes.length > 0) {
                credential.scopes = JSON.parse(credential.scopes);
              }
              if (typeof credential.isActive === 'string') {
                credential.isActive = credential.isActive === 'true';
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
      return (options && options.includePassword === true) ? credential : _.omit(credential, [config.models.credentials[type].passwordKey]);
    });
};

s.getAllCredentials = function (consumerId) {
  return credentialDao.getAllCredentials(consumerId);
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
      if (!credentialProperties) {
        return null;
      }
      utils.appendUpdatedAt(credentialProperties);
      return credentialDao.updateCredential(id, type, credentialProperties);
    });
};

s.removeCredential = function (id, type) {
  if (!id || !type) {
    return Promise.reject(new Error('invalid credential')); // TODO: replace with validation error
  }

  return credentialDao.removeCredential(id, type)
    .then(() => true);
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
      if (!credential) {
        return Promise.reject(new Error('credential not found'));
      }

      const existingScopes = credential.scopes ? (Array.isArray(credential.scopes) ? credential.scopes : [credential.scopes]) : [];
      const newScopes = _.uniq(_scopes.concat(existingScopes));
      return Promise.all([credentialDao.updateCredential(id, type, { scopes: JSON.stringify(newScopes) }),
        credentialDao.associateCredentialWithScopes(id, type, _scopes)
      ]);
    })
    .then(() => true);
};

s.removeScopesFromCredential = function (id, type, scopes) {
  return Promise.all([validateScopes(scopes), this.getCredential(id, type)])
    .then(([_scopes, credential]) => {
      if (!credential) {
        return Promise.reject(new Error('credential not found'));
      }

      const existingScopes = credential.scopes ? (Array.isArray(credential.scopes) ? credential.scopes : [credential.scopes]) : [];
      const newScopes = existingScopes.filter(val => _scopes.indexOf(val) === -1);
      return Promise.all([credentialDao.updateCredential(id, type, { scopes: JSON.stringify(newScopes) }),
        credentialDao.dissociateCredentialFromScopes(id, type, _scopes)
      ]);
    })
    .then(() => true);
};

s.setScopesForCredential = function (id, type, scopes) {
  return Promise.all([validateScopes(scopes), this.getCredential(id, type)])
    .then(([_scopes, credential]) => {
      if (!credential) {
        return Promise.reject(new Error('credential not found'));
      }

      return credentialDao.updateCredential(id, type, { scopes: JSON.stringify(_scopes) });
    })
    .then(() => true);
};

function validateAndHashPassword (credentialConfig, credentialDetails) {
  if (credentialDetails[credentialConfig.passwordKey]) {
    return utils.saltAndHash(credentialDetails[credentialConfig.passwordKey])
      .then(hash => {
        return { hash };
      });
  }

  if (!credentialConfig.autoGeneratePassword) {
    return Promise.reject(new Error(`${credentialConfig.passwordKey} is required`)); // TODO: replace with validation error
  }
  const password = uuidv4();

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
  const newCredentialProperties = {};

  for (const prop in _.omit(credentialConfig.properties, ['scopes'])) {
    const descriptor = credentialConfig.properties[prop];
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
  const newCredentialProperties = {};
  const credentialConfig = config.models.credentials[type];

  for (const prop in _.omit(credentialConfig.properties, ['scopes'])) {
    if (credentialDetails[prop]) {
      if (typeof credentialDetails[prop] !== 'string') {
        return Promise.reject(new Error('credential property must be a string')); // TODO: replace with validation error
      }
      if (credentialConfig.properties[prop].isMutable !== false) {
        newCredentialProperties[prop] = credentialDetails[prop];
      } else return Promise.reject(new Error(`${prop} is immutable`));
    }
  }

  return Object.keys(newCredentialProperties).length > 0 ? Promise.resolve(newCredentialProperties) : Promise.resolve(null);
}

function validateNewScopes (scopes) {
  const _scopes = validateScopes(scopes);
  return !_scopes ? Promise.reject(new Error('invalid scopes')) // TODO: replace with validation error
    : Promise.all(_scopes.map(val => s.existsScope(val)))
      .then(res => {
        return res.every(val => !val) ? _scopes
          : Promise.reject(new Error('one or more scopes already exist')); // TODO: replace with validation error
      });
}

function validateExistingScopes (scopes) {
  const _scopes = validateScopes(scopes);
  return !_scopes ? Promise.reject(new Error('invalid scopes')) // TODO: replace with validation error
    : Promise.all(_scopes.map(val => s.existsScope(val)))
      .then(res => {
        return res.every(val => val) ? _scopes
          : Promise.reject(new Error('one or more scopes don\'t exist')); // TODO: replace with validation error
      });
}

function validateScopes (scopes) {
  const _scopes = Array.isArray(scopes) ? _.uniq(scopes) : [scopes];
  if (!_scopes || _scopes.some(val => typeof val !== 'string')) {
    return false;
  } else return _scopes;
}

module.exports = s;
