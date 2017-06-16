'use strict';

let db = require('../../db')();
let redisConfig = require('../../config/config.redis.js').users;

let dao = {};

dao.insert = function (user) {
  let redisUserKey, redisUsernameSetKey;

  // key for the user hash table
  redisUserKey = redisConfig.userHashPrefix.concat(':', user.id);

  // name for the user's username set
  redisUsernameSetKey = redisConfig.usernameSetPrefix.concat(':', user.username);

  return db
  .multi()
  .hmset(redisUserKey, user)
  .sadd(redisUsernameSetKey, user.id)
  .execAsync()
  .then(res => res.every(val => val));
};

dao.getUserById = function (userId) {
  return db.hgetallAsync(redisConfig.userHashPrefix.concat(':', userId))
  .then(function (user) {
    if (!user || !Object.keys(user).length) {
      return false;
    }
    return user;
  });
};

dao.find = function (username) {
  return db.smembersAsync(redisConfig.usernameSetPrefix.concat(':', username))
  .then(function (Ids) {
    if (Ids && Ids.length !== 0) {
      return Ids[0];
    } else return false;
  });
};

dao.update = function (userId, props) {
  let redisUserKey;

  // key for the user in redis
  redisUserKey = redisConfig.userHashPrefix.concat(':', userId);

  return db
  .hmsetAsync(redisUserKey, props)
  .then(res => !!res);
};

dao.activate = function (id) {
  return db.hsetAsync(redisConfig.userHashPrefix.concat(':', id), 'isActive', 'true');
};

dao.deactivate = function (id) {
  return db.hsetAsync(redisConfig.userHashPrefix.concat(':', id), 'isActive', 'false');
};

dao.remove = function (userId) {
  return this.getUserById(userId)
  .then(function (user) {
    if (!user) {
      return false;
    }
    return db
    .multi()
    .del(redisConfig.userHashPrefix.concat(':', userId))
    .srem(redisConfig.usernameSetPrefix.concat(':', user.username), userId)
    .execAsync()
    .then(replies => replies.every(res => res));
  });
};

module.exports = dao;
