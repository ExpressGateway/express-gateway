'use strict';

let {getDb} = require('../db');
let userDao, db;

module.exports = function(config) {
  if (userDao) {
    return userDao;
  }

  db = getDb();

  /**
   * Insert user to the database. User should be searchable by its ID and username.
   * @param  {Object}  user
   * @return {string}  username
   */
  function insert(user) {
    let redisUserKey, redisUsernameSetKey;

    // key for the user hash table
    redisUserKey = config.users.redis.userHashPrefix.concat(':', user.id);

    // name for the user's username set
    redisUsernameSetKey = config.users.redis.usernameSetPrefix.concat(':', user.username);

    return db
    .multi()
    .hmset(redisUserKey, user)
    .sadd(redisUsernameSetKey, user.id)
    .execAsync()
    .then(res => res.every(val => val));
  }

  function getUserById(userId) {
    return db.hgetallAsync(config.users.redis.userHashPrefix.concat(':', userId))
    .then(function(user) {
      if (!user || !Object.keys(user).length) {
        return false;
      }
      return user;
    });
  }

  function find(username) {
    return db.smembersAsync(config.users.redis.usernameSetPrefix.concat(':', username))
    .then(function(Ids) {
      if (Ids && Ids.length !== 0) {
        return Ids[0];
      } else return false;
    });
  }

  function update(userId, props) {
    let redisUserKey;

    // key for the user in redis
    redisUserKey = config.users.redis.userHashPrefix.concat(':', userId);

    return db
    .hmsetAsync(redisUserKey, props)
    .then(res => !!res);
  }

  function activate(id) {
    return db.hsetAsync(config.users.redis.userHashPrefix.concat(':', id), 'isActive', 'true');
  }

  function deactivate(id) {
    return db.hsetAsync(config.users.redis.userHashPrefix.concat(':', id), 'isActive', 'false');
  }

  function remove(userId) {
    return getUserById(userId)
    .then(function(user) {
      if (!user) {
        return false;
      }
      return db
      .multi()
      .del(config.users.redis.userHashPrefix.concat(':', userId))
      .srem(config.users.redis.usernameSetPrefix.concat(':', user.username), userId)
      .execAsync()
      .then(replies => replies.every(res => res));
    });
  }

  userDao = {
    insert,
    find,
    getUserById,
    update,
    activate,
    deactivate,
    remove
  };

  return userDao;
}
