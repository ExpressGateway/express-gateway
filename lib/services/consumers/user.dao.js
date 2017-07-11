'use strict';

let db = require('../../db')();
let config = require('../../config');

let dao = {};
const userNamespace = 'user';
const usernameNamespace = 'username';

dao.insert = function (user) {
  let redisUserKey, redisUsernameSetKey;
  // key for the user hash table
  redisUserKey = config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', user.id);

  // name for the user's username set
  redisUsernameSetKey = config.systemConfig.db.redis.namespace.concat('-', usernameNamespace).concat(':', user.username);

  return db
  .multi()
  .hmset(redisUserKey, user)
  .sadd(redisUsernameSetKey, user.id)
  .execAsync()
  .then(res => res.every(val => val));
};

dao.getUserById = function (userId) {
  return db.hgetallAsync(config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', userId))
  .then(function (user) {
    if (!user || !Object.keys(user).length) {
      return false;
    }
    return user;
  });
};

dao.findAll = function (query) {
  let startFrom = query.start || 0;
  let key = config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':');
  return db.scanAsync(startFrom, 'MATCH', key + '*', 'COUNT', '100').then(resp => {
    let nextKey = resp[0];
    let userKeys = resp[1];
    if (!userKeys || userKeys.length === 0) return Promise.resolve({users: [], nextKey: 0});
    let promises = userKeys.map(key => db.hgetallAsync(key));
    return Promise.all(promises).then(users => {
      return {
        users,
        nextKey
      };
    });
  });
};

dao.find = function (username) {
  return db.smembersAsync(config.systemConfig.db.redis.namespace.concat('-', usernameNamespace).concat(':', username))
  .then(function (Ids) {
    if (Ids && Ids.length !== 0) {
      return Ids[0];
    } else return false;
  });
};

dao.update = function (userId, props) {
  let redisUserKey;

  // key for the user in redis
  redisUserKey = config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', userId);
  return db
  .hmsetAsync(redisUserKey, props)
  .then(res => !!res);
};

dao.activate = function (id) {
  return db.hmsetAsync(config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', id), ['isActive', 'true', 'updatedAt', String(new Date())]);
};

dao.deactivate = function (id) {
  return db.hmsetAsync(config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', id), ['isActive', 'false', 'updatedAt', String(new Date())]);
};

dao.remove = function (userId) {
  return this.getUserById(userId)
  .then(function (user) {
    if (!user) {
      return false;
    }
    return db
    .multi()
    .del(config.systemConfig.db.redis.namespace.concat('-', userNamespace).concat(':', userId))
    .srem(config.systemConfig.db.redis.namespace.concat('-', usernameNamespace).concat(':', user.username), userId)
    .execAsync()
    .then(replies => replies.every(res => res));
  });
};

module.exports = dao;
