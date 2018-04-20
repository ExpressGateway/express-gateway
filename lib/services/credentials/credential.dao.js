const db = require('../../db');
const config = require('../../config');
const logger = require('../../../lib/logger').gateway;
const scopeNamespace = 'scope';
const scopeCredentialsNamespace = 'scope-credentials';
const scopeDbKey = config.systemConfig.db.redis.namespace.concat('-', scopeNamespace);

const dao = {};

dao.insertScopes = function (_scopes) {
  const scopes = {};
  if (Array.isArray(_scopes)) {
    _scopes.forEach(el => { scopes[el] = 'true'; });
  } else scopes[_scopes] = 'true';

  return db.hmset(scopeDbKey, scopes);
};

dao.associateCredentialWithScopes = function (id, type, scopes) {
  const credentialKey = buildIdKey(type, id);
  if (!scopes) {
    return Promise.resolve(null);
  }

  scopes = Array.isArray(scopes) ? scopes : [scopes];
  const associationPromises = scopes.map(scope => db.hset(buildScopeKey(scope), credentialKey, 'true'));

  return Promise.all(associationPromises);
};

dao.dissociateCredentialFromScopes = function (id, type, scopes) {
  const credentialKey = buildIdKey(type, id);
  scopes = Array.isArray(scopes) ? scopes : [scopes];
  const dissociationPromises = scopes.map(scope => db.hdel(buildScopeKey(scope), credentialKey));

  return Promise.all(dissociationPromises);
};

dao.removeScopes = function (scopes) {
  let removeScopesTransaction;
  const getScopeCredentialPromises = [];

  scopes = Array.isArray(scopes) ? scopes : [scopes];

  removeScopesTransaction = db
    .multi()
    .hdel(scopeDbKey, scopes);

  // Get the list of ids with scopes to be removed, and remove scope-ids association
  scopes.forEach(scope => {
    getScopeCredentialPromises.push(db.hgetall(buildScopeKey(scope)));
    removeScopesTransaction = removeScopesTransaction.del(buildScopeKey(scope));
  });

  return Promise.all(getScopeCredentialPromises)
    .then(idObjs => {
      const getCredentialPromises = [];
      const credentialIdToScopes = {};

      scopes.forEach((scope, index) => {
        const ids = idObjs[index];

        for (const id in ids) {
          if (credentialIdToScopes[id]) {
            credentialIdToScopes[id].push(scope);
          } else credentialIdToScopes[id] = [scope];
        }
      });

      // Get dissociation promises for the id-scopes combination and promises to update credentials to remove scope
      for (const credentialId in credentialIdToScopes) {
        getCredentialPromises.push(db.hgetall(credentialId));
      }

      return Promise.all(getCredentialPromises)
        .then(credentialObjs => {
          let credentialScopes, newScopes;
          const credentialIds = Object.keys(credentialIdToScopes);

          credentialObjs.forEach((credentialObj, index) => {
            const credentialId = credentialIds[index];

            if (credentialObj && credentialObj.scopes) {
              credentialScopes = JSON.parse(credentialObj.scopes);
              newScopes = credentialScopes.filter(scope => scopes.indexOf(scope) === -1);
              removeScopesTransaction = removeScopesTransaction.hmset(credentialId, { scopes: JSON.stringify(newScopes) });
            }
          });

          return removeScopesTransaction.exec()
            .then(res => res[0]); // .del may yield 0 if a scope wasn't assigned to any credential
        });
    });
};

dao.existsScope = function (scope) {
  return db.hget(scopeDbKey, scope)
    .then(res => !!res);
};

dao.getAllScopes = function () {
  return db.hgetall(scopeDbKey)
    .then(res => {
      const scopes = Object.keys(res || {});
      return scopes.length ? scopes : null;
    });
};

dao.insertCredential = function (id, type, credentialObj) {
  if (!credentialObj) {
    return Promise.resolve(null);
  }
  const key = buildIdKey(type, id);
  if (type === 'key-auth') {
    if (credentialObj.keyId) credentialObj.id = credentialObj.keyId;
    return Promise.all([
      // build relation consumerId -> [key1, key2]
      db.sadd(buildIdKey(type, credentialObj.consumerId), id),
      // store key-auth keyid -> credentialObj
      db.hmset(key, credentialObj)
    ]);
  }
  return db.hmset(key, credentialObj);
};

dao.getCredential = function (id, type) {
  return db.hgetall(buildIdKey(type, id)).then(credential => {
    if (!credential || Object.keys(credential).length === 0) return null;
    credential.isActive = credential.isActive === 'true'; // Redis has no bool type, manual conversion
    credential.type = type;
    credential.id = id;
    return credential;
  }).catch(logger.warn);
};

dao.activateCredential = function (id, type) {
  return db.hmset(buildIdKey(type, id), { 'isActive': 'true', 'updatedAt': String(new Date()) });
};

dao.deactivateCredential = function (id, type) {
  return db.hmset(buildIdKey(type, id), { 'isActive': 'false', 'updatedAt': String(new Date()) });
};

dao.removeCredential = function (id, type) {
  return db.del(buildIdKey(type, id));
};

dao.removeAllCredentials = function (id) {
  const dbTransaction = db.multi();
  const credentialTypes = Object.keys(config.models.credentials.properties);
  const awaitAllPromises = [];
  credentialTypes.forEach((type) => {
    if (type === 'key-auth') {
      // id in this call is actually consumerId, so we need to get all referenced keyIds
      awaitAllPromises.push(db.smembers(buildIdKey(type, id)).then(ids => {
        ids.map(keyId => {
          dbTransaction.del(buildIdKey(type, keyId));
        });
      }));
    } else {
      dbTransaction.del(buildIdKey(type, id));
    }
  });

  return Promise.all(awaitAllPromises).then(() => dbTransaction.exec());
};

dao.getAllCredentials = function (consumerId) {
  const credentialTypes = Object.keys(config.models.credentials.properties);
  const awaitAllPromises = credentialTypes.map(type => {
    if (type === 'key-auth') { // TODO: replace with separate implementation per type instead of ifs
      return db.smembers(buildIdKey(type, consumerId)).then(keyIds => {
        // 1-* relation, finding all key-auth credentials (consumerid => [KeyId1, KeyId2, ..., KeyIdN])
        return Promise.all(keyIds.map(keyId => this.getCredential(keyId, type)));
      });
    }
    return this.getCredential(consumerId, type);
  });

  return Promise.all(awaitAllPromises)
    .then(results => Array.prototype.concat.apply([], results).filter(c => c));
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
