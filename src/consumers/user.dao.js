'use strict';

let getDb = require('../db');
let Promise = require('bluebird');
let uuid = require('node-uuid');
let utils = require('./utils');
let userDao, db;

module.exports = function(config) {
  if (userDao) {
    return userDao;
  }

  db = getDb(config.redis.host, config.redis.port);

  /**
   * Insert user to the database. User should be searchable by its ID, username and email.
   * @param  {Object}  user
   * @return {string}  username
   */
  function insert(user) {
    return utils.saltAndHash(user.password, config.bcrypt.saltRounds)
    .then(function(hash) {
      let userId, userHashKey, usernameSetKey, emailSetKey;

      if (!hash) {
        return Promise.reject(new Error('failed to hash password'));
      }

      user.password = hash;
      userId = uuid.v4();

      // key for the user hash table
      userHashKey = config.users.redis.userHashPrefix.concat(':', userId);

      // name for the user's username set
      usernameSetKey = config.users.redis.usernameSetPrefix.concat(':', user.username);

      // name for the user's email set
      emailSetKey = config.users.redis.emailSetPrefix.concat(':', user.email);

      return db
      .multi()
      .hmset(userHashKey, user)
      .sadd(usernameSetKey, userId)
      .sadd(emailSetKey, userId)
      .execAsync()
      .then(function(res) {
        // should return true only is all responses are positive
        let success = res.every(function(val) {return val;});
        return success ? userId : null;
      });
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

  function getUserIdByEmail(email) {
    return db.smembersAsync(config.users.redis.emailSetPrefix.concat(':', email))
    .then(function(Ids) {
      if (Ids && Ids.length !== 0) {
        return Ids[0];
      } else return null;
    });
  }

  function authenticate(username, password) {
    return getUserIdByUsername(username)
    .then(function(userId) {
      return getUserById(userId)
      .then(function(user) {
        if (!user) {
          return null;
        }
        return utils.compareSaltAndHashed(password, user.password)
        .then(function(matches) {
          if (matches) {
            return userId;
          } else return null;
        });
      });
    });
  }

  function update(userId, props) {
    let updateProps;
    if (props.password) {
      updateProps = utils.saltAndHash(props.password, config.bcrypt.saltRounds);
    } else updateProps = Promise.resolve(null);

    return updateProps
    .then(function(hash) {
      if (hash) {
        props.password = hash;
      }
      return getUserById(userId)
      .then(function(existingUserProperties) {
        let updateQuery, userHashKey, usernameSetKey, existingUsernameSetKey, emailSetKey, existingEmailSetKey;

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

        if (props.email) {
          // name for the user's new username set
          emailSetKey = config.users.redis.emailSetPrefix.concat(':', props.email);

          // name for the user's old email set
          existingEmailSetKey = config.users.redis.emailSetPrefix.concat(':', existingUserProperties.email);

          updateQuery = updateQuery
          .sadd(emailSetKey, userId)
          .srem(existingEmailSetKey, userId);
        }

        return updateQuery
        .execAsync()
        .then(function(res) {
          return !res.some(function(val) { // should return true only is all responses are positive
            return !val;
          });
        });
      });
    });
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
      .srem(config.users.redis.emailSetPrefix.concat(':', user.email), userId)
      .execAsync()
      .then(function(replies) {
        return replies.every((res) => res !== 0 || Number.isInteger(res));
      });
    });
  }

  userDao = {
    insert: insert,
    usernameExists: usernameExists,
    getUserIdByUsername: getUserIdByUsername,
    getUserIdByEmail: getUserIdByEmail,
    authenticate: authenticate,
    getUserById: getUserById,
    update: update,
    remove: remove,
  };

  return userDao;
}
