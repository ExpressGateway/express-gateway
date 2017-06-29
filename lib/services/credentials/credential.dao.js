'use strict';

const scopeNamespace = 'scope';
const scopeCredentialsNamespace = 'scope-credentials';
let db = require('../../db')();
let config = require('../../config');
let scopeDbKey = config.systemConfig.db.redis.namespace.concat('-', scopeNamespace);

let dao = {};

dao.insertScopes = function (_scopes) {
  let scopes = {};
  if (Array.isArray(_scopes)) {
    _scopes.forEach(el => { scopes[el] = 'true'; });
  } else scopes[_scopes] = 'true';

  return db.hmsetAsync(scopeDbKey, scopes);
};

dao.associateCredentialWithScopes = function (id, type, scopes) {
  let credentialKey = buildIdKey(type, id);
  if (!scopes) {
    return Promise.resolve(null);
  }

  let associationPromises;
  scopes = Array.isArray(scopes) ? scopes : [ scopes ];
  associationPromises = scopes.map(scope => db.hsetAsync(buildScopeKey(scope), credentialKey, 'true'));

  return Promise.all(associationPromises)
  .catch(() => Promise.reject(new Error('failed to associate credential with scopes in db'))); // TODO: replace with server error
};

dao.dissociateCredentialFromScopes = function (id, type, scopes) {
  let credentialKey = buildIdKey(type, id);
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
  .hdel(scopeDbKey, scopes);

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
  return db.hgetAsync(scopeDbKey, scope)
  .then(res => !!res);
};

dao.getAllScopes = function () {
  return db.hgetallAsync(scopeDbKey)
  .then(res => {
    return res ? Object.keys(res) : null;
  });
};

dao.insertCredential = function (id, type, credentialObj) {
  if (!credentialObj) {
    return Promise.resolve(null);
  }
  if (type === 'key-auth') {
    return Promise.all([
      // build relation consumerId -> [key1, key2]
      db.saddAsync(buildIdKey(type, credentialObj.consumerId), id),
      // store key-auth keyid -> credentialObj
      db.hmsetAsync(buildIdKey(type, id), credentialObj)
    ]);
  }
  return db.hmsetAsync(buildIdKey(type, id), credentialObj);
};

dao.getCredential = function (id, type) {
  return db.hgetallAsync(buildIdKey(type, id));
};

dao.activateCredential = function (id, type) {
  return db.hsetAsync(buildIdKey(type, id), ['isActive', 'true', 'updatedAt', String(new Date())]);
};

dao.deactivateCredential = function (id, type) {
  return db.hsetAsync(buildIdKey(type, id), ['isActive', 'false', 'updatedAt', String(new Date())]);
};

dao.removeCredential = function (id, type) {
  return db.delAsync(buildIdKey(type, id));
};

dao.removeAllCredentials = function (id) {
  let dbTransaction = db.multi();
  let credentialTypes = Object.keys(config.models.credentials);
  let awaitAllPromises = [];
  credentialTypes.forEach((type) => {
    if (type === 'key-auth') {
      // id in this call is actually consumerId, so we need to get all referenced keyIds
      awaitAllPromises.push(db.smembersAsync(buildIdKey(type, id)).then(ids => {
        ids.map(keyId => {
          dbTransaction.delAsync(buildIdKey(type, keyId));
        });
      }));
    } else {
      dbTransaction.del(buildIdKey(type, id));
    }
  });

  return Promise.all(awaitAllPromises).then(() => dbTransaction.execAsync());
};

dao.updateCredential = function (id, type, credentialObj) {
  return this.insertCredential(id, type, credentialObj);
};

module.exports = dao;

function buildScopeKey (scope) {
  return config.systemConfig.db.redis.namespace.concat('-', scopeCredentialsNamespace).concat(':', scope);
}
function buildIdKey (type, id) {
  return config.systemConfig.db.redis.namespace.concat('-', type).concat(':', id);
}
