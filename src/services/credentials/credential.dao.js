'use strict';

let Promise = require('bluebird');
let db = require('../../db')();
let redisConfig = require('../../config/config.redis.js').credentials;
let modelConfig = require('../../config/models/credentials');

let dao = {};

dao.insertScopes = function (_scopes) {
  let scopes = {};
  if (Array.isArray(_scopes)) {
    _scopes.forEach(el => { scopes[el] = 'true'; });
  } else scopes[_scopes] = 'true';
  return db.hmsetAsync(redisConfig.scopePrefix, scopes);
};

dao.associateCredentialWithScopes = function (id, type, scopes) {
  let credentialId = redisConfig.credentialPrefixes[type].concat(':', id);
  let associationPromises;
  scopes = Array.isArray(scopes) ? scopes : [ scopes ];
  associationPromises = scopes.map(scope => db.hsetAsync(redisConfig.scopeCredentialPrefix.concat(':', scope), credentialId, 'true'));

  return Promise.all(associationPromises)
  .catch(() => Promise.reject(new Error('failed to associate credential with scopes in db'))); // TODO: replace with server error
};

dao.dissociateCredentialFromScopes = function (id, type, scopes) {
  let credentialId = redisConfig.credentialPrefixes[type].concat(':', id);
  let dissociationPromises;
  scopes = Array.isArray(scopes) ? scopes : [ scopes ];
  dissociationPromises = scopes.map(scope => db.hdelAsync(redisConfig.scopeCredentialPrefix.concat(':', scope), credentialId));

  return Promise.all(dissociationPromises)
  .catch(() => Promise.reject(new Error('failed to dissociate credential with scopes in db'))); // TODO: replace with server error
};

dao.removeScopes = function (scopes) {
  let removeScopesTransaction;
  let getScopeCredentialPromises = [];

  scopes = Array.isArray(scopes) ? scopes : [ scopes ];

  removeScopesTransaction = db
  .multi()
  .hdel(redisConfig.scopePrefix, scopes);

  // Get the list of ids with scopes to be removed, and remove scope-ids association
  scopes.forEach(scope => {
    getScopeCredentialPromises.push(db.hgetallAsync(redisConfig.scopeCredentialPrefix.concat(':', scope)));
    removeScopesTransaction = removeScopesTransaction.del(redisConfig.scopeCredentialPrefix.concat(':', scope));
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
  return db.hgetAsync(redisConfig.scopePrefix, scope)
  .then(res => !!res);
};

dao.getAllScopes = function () {
  return db.hgetallAsync(redisConfig.scopePrefix)
  .then(res => {
    return res ? Object.keys(res) : null;
  });
};

dao.insertCredential = function (id, type, credentialObj) {
  if (!credentialObj) {
    return Promise.resolve(null);
  }
  return db.hmsetAsync(redisConfig.credentialPrefixes[type].concat(':', id), credentialObj);
};

dao.getCredential = function (id, type) {
  return db.hgetallAsync(redisConfig.credentialPrefixes[type].concat(':', id));
};

dao.activateCredential = function (id, type) {
  return db.hsetAsync(redisConfig.credentialPrefixes[type].concat(':', id), 'isActive', 'true');
};

dao.deactivateCredential = function (id, type) {
  return db.hsetAsync(redisConfig.credentialPrefixes[type].concat(':', id), 'isActive', 'false');
};

dao.removeCredential = function (id, type) {
  return db.delAsync(redisConfig.credentialPrefixes[type].concat(':', id));
};

dao.removeAllCredentials = function (id) {
  let dbTransaction = db.multi();
  let credentialTypes = Object.keys(modelConfig);

  credentialTypes.forEach((type) => {
    dbTransaction = dbTransaction.del(redisConfig.credentialPrefixes[type].concat(':', id));
  });

  return dbTransaction.execAsync();
};

dao.updateCredential = function (id, type, credentialObj) {
  return this.insertCredential(id, type, credentialObj);
};

module.exports = dao;
