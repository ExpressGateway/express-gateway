'use strict';

let db = require('../../db')();
let config = require('../../config');

let dao = {};

const authCodeNamespace = 'auth-code';

dao.save = function (code) {
  // key for the code hash table
  let redisCodeKey = config.systemConfig.db.redis.namespace.concat('-', authCodeNamespace).concat(':', code.id);
  return db.hmsetAsync(redisCodeKey, code);
};

dao.find = function (criteria) {
  return db.hgetallAsync(config.systemConfig.db.redis.namespace.concat('-', authCodeNamespace).concat(':', criteria.id))
  .then((code) => {
    let isEqual;

    if (!code) {
      return null;
    }

    if (code.expiresAt <= Date.now()) {
      return this.remove(criteria.id)
      .return(null);
    }

    isEqual = Object.keys(criteria).every((key) => criteria[key] === code[key]);
    return isEqual ? code : null;
  });
};

dao.get = function (id) {
  return db.hgetallAsync(config.systemConfig.db.redis.namespace.concat('-', authCodeNamespace).concat(':', id));
};

dao.remove = function (id) {
  return db.delAsync(config.systemConfig.db.redis.namespace.concat('-', authCodeNamespace).concat(':', id));
};

module.exports = dao;
