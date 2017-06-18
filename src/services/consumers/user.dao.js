'use strict';

let db = require('../../db')();
let config = require('../../config');

let dao = {};

dao.insert = function (user) {
  let redisUserKey, redisUsernameSetKey;

  // key for the user hash table
  redisUserKey = config.systemConfig.db.redis.users.userHashPrefix.concat(':', user.id);

  // name for the user's username set
  redisUsernameSetKey = config.systemConfig.db.redis.users.usernameSetPrefix.concat(':', user.username);

  return db
  .multi()
  .hmset(redisUserKey, user)
  .sadd(redisUsernameSetKey, user.id)
  .execAsync()
  .then(res => res.every(val => val));
};

dao.getUserById = function (userId) {
  return db.hgetallAsync(config.systemConfig.db.redis.users.userHashPrefix.concat(':', userId))
  .then(function (user) {
    if (!user || !Object.keys(user).length) {
      return false;
    }
    return user;
  });
};

dao.find = function (username) {
  return db.smembersAsync(config.systemConfig.db.redis.users.usernameSetPrefix.concat(':', username))
  .then(function (Ids) {
    if (Ids && Ids.length !== 0) {
      return Ids[0];
    } else return false;
  });
};

dao.update = function (userId, props) {
  let redisUserKey;

  // key for the user in redis
  redisUserKey = config.systemConfig.db.redis.users.userHashPrefix.concat(':', userId);

  return db
  .hmsetAsync(redisUserKey, props)
  .then(res => !!res);
};

dao.activate = function (id) {
  return db.hsetAsync(config.systemConfig.db.redis.users.userHashPrefix.concat(':', id), 'isActive', 'true');
};

dao.deactivate = function (id) {
  return db.hsetAsync(config.systemConfig.db.redis.users.userHashPrefix.concat(':', id), 'isActive', 'false');
};

dao.remove = function (userId) {
  return this.getUserById(userId)
  .then(function (user) {
    if (!user) {
      return false;
    }
    return db
    .multi()
    .del(config.systemConfig.db.redis.users.userHashPrefix.concat(':', userId))
    .srem(config.systemConfig.db.redis.users.usernameSetPrefix.concat(':', user.username), userId)
    .execAsync()
    .then(replies => replies.every(res => res));
  });
};

module.exports = dao;
