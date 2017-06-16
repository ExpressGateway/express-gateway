'use strict';

let db = require('../../db')();
let redisConfig = require('../../config/config.system.js').db.redis.authorizationCodes;

let dao = {};

dao.save = function (code) {
  // key for the code hash table
  let redisCodeKey = redisConfig.codeHashPrefix.concat(':', code.id);
  return db.hmsetAsync(redisCodeKey, code);
};

dao.find = function (criteria) {
  return db.hgetallAsync(redisConfig.codeHashPrefix.concat(':', criteria.id))
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
  return db.hgetallAsync(redisConfig.codeHashPrefix.concat(':', id));
};

dao.remove = function (id) {
  return db.delAsync(redisConfig.codeHashPrefix.concat(':', id));
};

module.exports = dao;
