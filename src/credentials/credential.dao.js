'use strict';

let Promise = require('bluebird');
let {getDb} = require('../db');
let credentialDao, db;

module.exports = function (config) {
  if (credentialDao) {
    return credentialDao;
  }

  db = getDb();

  function insertScopes (_scopes) {
    let scopes = {};
    if (Array.isArray(_scopes)) {
      _scopes.forEach(el => { scopes[el] = 'true'; });
    } else scopes[_scopes] = 'true';
    return db.hmsetAsync(config.credentials.redis.scopePrefix, scopes);
  }

  function associateCredentialWithScopes (id, type, scopes) {
    let credentialId = config.credentials.redis.credentialPrefixes[type].concat(':', id);
    let associationPromises;
    scopes = Array.isArray(scopes) ? scopes : [ scopes ];
    associationPromises = scopes.map(scope => db.hsetAsync(config.credentials.redis.scopeCredentialPrefix.concat(':', scope), credentialId, 'true'));

    return Promise.all(associationPromises)
    .catch(() => Promise.reject(new Error('failed to associate credential with scopes in db'))); // TODO: replace with server error
  }

  function dissociateCredentialFromScopes (id, type, scopes) {
    let credentialId = config.credentials.redis.credentialPrefixes[type].concat(':', id);
    let dissociationPromises;
    scopes = Array.isArray(scopes) ? scopes : [ scopes ];
    dissociationPromises = scopes.map(scope => db.hdelAsync(config.credentials.redis.scopeCredentialPrefix.concat(':', scope), credentialId));

    return Promise.all(dissociationPromises)
    .catch(() => Promise.reject(new Error('failed to dissociate credential with scopes in db'))); // TODO: replace with server error
  }

  function removeScopes (scopes) {
    let removeScopesTransaction;
    let getScopeCredentialPromises = [];

    scopes = Array.isArray(scopes) ? scopes : [ scopes ];

    removeScopesTransaction = db
    .multi()
    .hdel(config.credentials.redis.scopePrefix, scopes);

    // Get the list of ids with scopes to be removed, and remove scope-ids association
    scopes.forEach(scope => {
      getScopeCredentialPromises.push(db.hgetallAsync(config.credentials.redis.scopeCredentialPrefix.concat(':', scope)));
      removeScopesTransaction = removeScopesTransaction.del(config.credentials.redis.scopeCredentialPrefix.concat(':', scope));
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
  }

  function existsScope (scope) {
    return db.hgetAsync(config.credentials.redis.scopePrefix, scope)
    .then(res => !!res);
  }

  function getAllScopes () {
    return db.hgetallAsync(config.credentials.redis.scopePrefix)
    .then(res => {
      return res ? Object.keys(res) : null;
    });
  }

  function insertCredential (id, type, credentialObj) {
    if (!credentialObj) {
      return Promise.resolve(null);
    }
    return db.hmsetAsync(config.credentials.redis.credentialPrefixes[type].concat(':', id), credentialObj);
  }

  function getCredential (id, type) {
    return db.hgetallAsync(config.credentials.redis.credentialPrefixes[type].concat(':', id));
  }

  function activateCredential (id, type) {
    return db.hsetAsync(config.credentials.redis.credentialPrefixes[type].concat(':', id), 'isActive', 'true');
  }

  function deactivateCredential (id, type) {
    return db.hsetAsync(config.credentials.redis.credentialPrefixes[type].concat(':', id), 'isActive', 'false');
  }

  function removeCredential (id, type) {
    return db.delAsync(config.credentials.redis.credentialPrefixes[type].concat(':', id));
  }

  function removeAllCredentials (id) {
    let dbTransaction = db.multi();
    let credentialTypes = Object.keys(config.credentials.types);

    credentialTypes.forEach((type) => {
      dbTransaction = dbTransaction.del(config.credentials.redis.credentialPrefixes[type].concat(':', id));
    });

    return dbTransaction.execAsync();
  }

  function updateCredential (id, type, credentialObj) {
    return insertCredential(id, type, credentialObj);
  }

  credentialDao = {
    insertScopes,
    removeScopes,
    existsScope,
    getAllScopes,
    associateCredentialWithScopes,
    dissociateCredentialFromScopes,
    insertCredential,
    getCredential,
    activateCredential,
    deactivateCredential,
    removeCredential,
    removeAllCredentials,
    updateCredential
  };

  return credentialDao;
};
