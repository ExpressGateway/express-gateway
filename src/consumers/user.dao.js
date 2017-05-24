'use strict';

let getDb = require('../db');
let Promise = require('bluebird');
let userDao, db;

module.exports = function(config) {
  if (userDao) {
    return userDao;
  }

  db = getDb(config.redis.host, config.redis.port);

  /**
   * Insert user to the database. User should be searchable by its ID and username.
   * @param  {Object}  user
   * @return {string}  username
   */
  function insert(user) {
    let userHashKey, usernameSetKey;

    // key for the user hash table
    userHashKey = config.users.redis.userHashPrefix.concat(':', user.id);

    // name for the user's username set
    usernameSetKey = config.users.redis.usernameSetPrefix.concat(':', user.username);

    return db
    .multi()
    .hmset(userHashKey, user)
    .sadd(usernameSetKey, user.id)
    .execAsync()
    .then(function(res) {
      // should return true only if all responses are positive
      return res.every(function(val) {return val;});
    });
  }

  function usernameExists(username) {
    return getUserIdByUsername(username)
    .then(function(result) {
      return !!result;
    });
  }

  function getUserById(userId) {
    return db.hgetallAsync(config.users.redis.userHashPrefix.concat(':', userId))
    .then(function(user) {
      if (!user || !Object.keys(user).length) {
        return null;
      }
      user['id'] = userId;
      return user;
    });
  }

  function getUserIdByUsername(username) {
    return db.smembersAsync(config.users.redis.usernameSetPrefix.concat(':', username))
    .then(function(Ids) {
      if (Ids && Ids.length !== 0) {
        return Ids[0];
      } else return null;
    });
  }

  function update(userId, props) {
    return getUserById(userId)
    .then(function(existingUserProperties) {
      let updateQuery, userHashKey, usernameSetKey, existingUsernameSetKey;

      if(!existingUserProperties) {
        return Promise.reject(new Error('user not found'));
      }

      // key for the user hash table
      userHashKey = config.users.redis.userHashPrefix.concat(':', userId);

      updateQuery = db
      .multi()
      .hmset(userHashKey, props);

      if (props.username) {
        // name for the user's new username set
        usernameSetKey = config.users.redis.usernameSetPrefix.concat(':', props.username);

        // name for the user's old username set
        existingUsernameSetKey = config.users.redis.usernameSetPrefix.concat(':', existingUserProperties.username);

        updateQuery = updateQuery
        .sadd(usernameSetKey, userId)
        .srem(existingUsernameSetKey, userId);
      }

      return updateQuery
      .execAsync()
      .then(function(res) {
        return !res.some(function(val) { // should return true only is all responses are positive
          return !val;
        });
      });
    });
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
        return null;
      }
      return db
      .multi()
      .del(config.users.redis.userHashPrefix.concat(':', userId))
      .srem(config.users.redis.usernameSetPrefix.concat(':', user.username), userId)
      .execAsync()
      .then(function(replies) {
        return replies.every((res) => res !== 0 || Number.isInteger(res));
      });
    });
  }

  userDao = {
    insert,
    usernameExists,
    getUserIdByUsername,
    getUserById,
    update,
    activate,
    deactivate,
    remove
  };

  return userDao;
}
