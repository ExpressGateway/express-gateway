'use strict';

let Promise = require('bluebird');
let db = require('../../db')();
let config = require('../../config');

let dao = {};

const scopeNamespace = 'scope';
const scopeCredentialsNamespace = 'scope-credentials';

dao.insertScopes = function (_scopes) {
  let scopes = {};
  if (Array.isArray(_scopes)) {
    _scopes.forEach(el => { scopes[el] = 'true'; });
  } else scopes[_scopes] = 'true';

  return db.hmsetAsync(config.systemConfig.db.redis.namespace.concat('-', scopeNamespace), scopes);
};

dao.associateCredentialWithScopes = function (id, type, scopes) {
  let credentialKey = config.systemConfig.db.redis.namespace.concat('-', type).concat(':', id);
  let associationPromises;
  scopes = Array.isArray(scopes) ? scopes : [ scopes ];
  associationPromises = scopes.map(scope => db.hsetAsync(config.systemConfig.db.redis.namespace.concat('-', scopeCredentialsNamespace).concat(':', scope), credentialKey, 'true'));

  return Promise.all(associationPromises)
  .catch(() => Promise.reject(new Error('failed to associate credential with scopes in db'))); // TODO: replace with server error
};

dao.dissociateCredentialFromScopes = function (id, type, scopes) {
  let credentialKey = config.systemConfig.db.redis.namespace.concat('-', type).concat(':', id);
  let dissociationPromises;
  scopes = Array.isArray(scopes) ? scopes : [ scopes ];
  dissociationPromises = scopes.map(scope => db.hdelAsync(config.systemConfig.db.redis.namespace.concat('-', scopeCredentialsNamespace).concat(':', scope), credentialKey));

  return Promise.all(dissociationPromises)
  .catch(() => Promise.reject(new Error('failed to dissociate credential with scopes in db'))); // TODO: replace with server error
};

dao.removeScopes = function (scopes) {
  let removeScopesTransaction;
  let getScopeCredentialPromises = [];

  scopes = Array.isArray(scopes) ? scopes : [ scopes ];

  removeScopesTransaction = db
  .multi()
  .hdel(config.systemConfig.db.redis.namespace.concat('-', scopeNamespace), scopes);

  // Get the list of ids with scopes to be removed, and remove scope-ids association
  scopes.forEach(scope => {
    getScopeCredentialPromises.push(db.hgetallAsync(config.systemConfig.db.redis.namespace.concat('-', scopeCredentialsNamespace).concat(':', scope)));
    removeScopesTransaction = removeScopesTransaction.del(config.systemConfig.db.redis.namespace.concat('-', scopeCredentialsNamespace).concat(':', scope));
  });

  return Promise.all(getScopeCredentialPromises)
  .then(idObjs => {
    let getCredentialPromises = [];
    let credentialIdToScopes = {};

    scopes.forEach((scope, index) => {
      let ids = idObjs[index];

      for (let id in ids) {
        if (credentialIdToScopes[id]) {
          credentialIdToScopes[id].push(scope);
        } else credentialIdToScopes[id] = [ scope ];
      }
    });

    // Get dissociation promises for the id-scopes combination and promises to update credentials to remove scope
    for (let credentialId in credentialIdToScopes) {
      getCredentialPromises.push(db.hgetallAsync(credentialId));
    }

    return Promise.all(getCredentialPromises)
    .then(credentialObjs => {
      let credentialScopes, newScopes;
      let credentialIds = Object.keys(credentialIdToScopes);

      credentialObjs.forEach((credentialObj, index) => {
        let credentialId = credentialIds[index];

        if (credentialObj && credentialObj.scopes) {
          credentialScopes = JSON.parse(credentialObj.scopes);
          newScopes = credentialScopes.filter(scope => scopes.indexOf(scope) === -1);
          removeScopesTransaction = removeScopesTransaction.hmset(credentialId, { scopes: JSON.stringify(newScopes) });
        }
      });

      return removeScopesTransaction.execAsync()
      .then(res => res[0]); // .del may yield 0 if a scope wasn't assigned to any credential
    });
  });
};

dao.existsScope = function (scope) {
  return db.hgetAsync(config.systemConfig.db.redis.namespace.concat('-', scopeNamespace), scope)
  .then(res => !!res);
};

dao.getAllScopes = function () {
  return db.hgetallAsync(config.systemConfig.db.redis.namespace.concat('-', scopeNamespace))
  .then(res => {
    return res ? Object.keys(res) : null;
  });
};

dao.insertCredential = function (id, type, credentialObj) {
  if (!credentialObj) {
    return Promise.resolve(null);
  }
  return db.hmsetAsync(config.systemConfig.db.redis.namespace.concat('-', type).concat(':', id), credentialObj);
};

dao.getCredential = function (id, type) {
  return db.hgetallAsync(config.systemConfig.db.redis.namespace.concat('-', type).concat(':', id));
};

dao.activateCredential = function (id, type) {
  return db.hsetAsync(config.systemConfig.db.redis.namespace.concat('-', type).concat(':', id), ['isActive', 'true', 'updatedAt', String(new Date())]);
};

dao.deactivateCredential = function (id, type) {
  return db.hsetAsync(config.systemConfig.db.redis.namespace.concat('-', type).concat(':', id), ['isActive', 'false', 'updatedAt', String(new Date())]);
};

dao.removeCredential = function (id, type) {
  return db.delAsync(config.systemConfig.db.redis.namespace.concat('-', type).concat(':', id));
};

dao.removeAllCredentials = function (id) {
  let dbTransaction = db.multi();
  let credentialTypes = Object.keys(config.models.credentials);

  credentialTypes.forEach((type) => {
    dbTransaction = dbTransaction.del(config.systemConfig.db.redis.namespace.concat('-', type).concat(':', id));
  });

  return dbTransaction.execAsync();
};

dao.updateCredential = function (id, type, credentialObj) {
  return this.insertCredential(id, type, credentialObj);
};

module.exports = dao;
