'use strict';

let db = require('../db').getDb();
let authCodeDao, authCodeDbConfig;

module.exports = function (config) {
  if (authCodeDao) {
    return authCodeDao;
  }

  authCodeDbConfig = config.authorizationCodes.redis;

  function save (code) {
    // key for the code hash table
    let redisCodeKey = authCodeDbConfig.codeHashPrefix.concat(':', code.id);
    return db.hmsetAsync(redisCodeKey, code);
  }

  function find (criteria) {
    return db.hgetallAsync(authCodeDbConfig.codeHashPrefix.concat(':', criteria.id))
    .then((code) => {
      let isEqual;

      if (!code) {
        return null;
      }

      if (code.expiresAt <= Date.now()) {
        return remove(criteria.id)
        .return(null);
      }

      isEqual = Object.keys(criteria).every((key) => criteria[key] === code[key]);
      return isEqual ? code : null;
    });
  }

  function get (id) {
    return db.hgetallAsync(authCodeDbConfig.codeHashPrefix.concat(':', id));
  }

  function remove (id) {
    return db.delAsync(authCodeDbConfig.codeHashPrefix.concat(':', id));
  }

  authCodeDao = {
    save,
    find,
    get,
    remove
  };

  return authCodeDao;
};
