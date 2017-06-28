'use strict';
// TODO: need to be reimplemented to support different strategies for different credential types
const scopeNamespace = 'scope';
const scopeCredentialsNamespace = 'scope-credentials';
let db = require('../../db')();
let config = require('../../config');
let scopeNs = config.systemConfig.db.redis.namespace.concat('-', scopeNamespace);
let buildScopeKey = (scope) => config.systemConfig.db.redis.namespace.concat('-', scopeCredentialsNamespace).concat(':', scope);
let buildTypeKey = (type) => config.systemConfig.db.redis.namespace.concat('-', type);

let dao = {};

dao.insertScopes = function (_scopes) {
  let scopes = {};
  if (Array.isArray(_scopes)) {
    _scopes.forEach(el => { scopes[el] = 'true'; });
  } else scopes[_scopes] = 'true';

  return db.hmsetAsync(scopeNs, scopes);
};

dao.associateCredentialWithScopes = function (id, type, scopes) {
  if (!scopes) {
    return Promise.resolve(null);
  }
  let credentialKey = buildTypeKey(type).concat(':', id);
  let associationPromises;
  scopes = Array.isArray(scopes) ? scopes : [ scopes ];
  associationPromises = scopes.map(scope => db.hsetAsync(buildScopeKey(scope), credentialKey, 'true'));

  return Promise.all(associationPromises)
  .catch(() => Promise.reject(new Error('failed to associate credential with scopes in db'))); // TODO: replace with server error
};

dao.dissociateCredentialFromScopes = function (id, type, scopes) {
  let credentialKey = buildTypeKey(type).concat(':', id);
  let dissociationPromises;
  scopes = Array.isArray(scopes) ? scopes : [ scopes ];
  dissociationPromises = scopes.map(scope => db.hdelAsync(buildScopeKey(scope), credentialKey));

  return Promise.all(dissociationPromises)
  .catch(() => Promise.reject(new Error('failed to dissociate credential with scopes in db'))); // TODO: replace with server error
};

dao.removeScopes = function (scopes) {
  let removeScopesTransaction;
  let getScopeCredentialPromises = [];

  scopes = Array.isArray(scopes) ? scopes : [ scopes ];

  removeScopesTransaction = db
  .multi()
  .hdel(scopeNs, scopes);

  // Get the list of ids with scopes to be removed, and remove scope-ids association
  scopes.forEach(scope => {
    getScopeCredentialPromises.push(db.hgetallAsync(buildScopeKey(scope)));
    removeScopesTransaction = removeScopesTransaction.del(buildScopeKey(scope));
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
  return db.hgetAsync(scopeNs, scope)
  .then(res => !!res);
};

dao.getAllScopes = function () {
  return db.hgetallAsync(scopeNs)
  .then(res => {
    return res ? Object.keys(res) : null;
  });
};

dao.insertCredential = function (consumerId, type, credentialObj) {
  if (!credentialObj) {
    return Promise.resolve(null);
  }

 // this makes lookup by appId possible (for CLI usage)
  let saveCredentialByConsumerId =
    db.hmsetAsync(buildTypeKey(type).concat(':', consumerId), credentialObj);

  if (type === 'key-auth') { // TODO: temp solution, could be implemented as inheritance
    credentialObj.consumerId = consumerId;

    if (!credentialObj.keyId || !credentialObj.keySecret) {
      return Promise.reject(new Error('key-auth credetinals not provided'));
    }
    return Promise.all([
      // this makes lookup by keyId\keySecret possible
      db.hmsetAsync(buildTypeKey(type).concat(':', credentialObj.keyId, ':', credentialObj.keySecret), credentialObj),
      saveCredentialByConsumerId
    ]).then(() => credentialObj);
  }
  return saveCredentialByConsumerId;
};

dao.getCredential = function (query, type) {
  let id = query.id || query.consumerId;

  // TODO: should be not if but inheritance\override with Strategy\Factory
  // 2 possible ways to get creds:
  // by id or by keyId\KeySecret
  if (type === 'key-auth' && !id) {
    return db.hgetallAsync(buildTypeKey(type).concat(':', query.keyId, ':', query.keySecret));
  }
  return db.hgetallAsync(buildTypeKey(type).concat(':', id));
};

dao.activateCredential = function (id, type) {
  return db.hsetAsync(buildTypeKey(type).concat(':', id), ['isActive', 'true', 'updatedAt', String(new Date())]);
};

dao.deactivateCredential = function (id, type) {
  return db.hsetAsync(buildTypeKey(type).concat(':', id), ['isActive', 'false', 'updatedAt', String(new Date())]);
};

dao.removeCredential = function (id, type) {
  return db.delAsync(buildTypeKey(type).concat(':', id));
};

dao.removeAllCredentials = function (id) {
  let dbTransaction = db.multi();
  let credentialTypes = Object.keys(config.models.credentials);

  credentialTypes.forEach((type) => {
    dbTransaction = dbTransaction.del(buildTypeKey(type).concat(':', id));
  });

  return dbTransaction.execAsync();
};

dao.updateCredential = function (consumerId, type, credentialObj) {
  return this.insertCredential(consumerId, type, credentialObj);
};

module.exports = dao;
