'use strict';

let _ = require('lodash');
let getDb = require('../db');
let Promise = require('bluebird');
let utils = require('../utils');
let applicationDao, db;

module.exports = function(config) {
  if (applicationDao) {
    return applicationDao;
  }

  db = getDb(config.redis.host, config.redis.port);

  /**
   * Insert application to the database. Application should be searchable by its ID.
   * @param  {Object}  user
   * @return {bool}    success
   */
  function insert(_app) {
    let app = _.cloneDeep(_app);
    return utils.saltAndHash(app.secret, config.bcrypt.saltRounds)
    .then(function(hash) {
      let appHashKey, userAppsHashKey;

      if (!hash) {
        return Promise.reject(new Error('failed to hash secret'));
      }

      app.secret = hash;

      // key for the app hash table
      appHashKey = config.apps.redis.appHashPrefix.concat(':', app.id);

      // key for the user-apps hash table
      userAppsHashKey = config.apps.redis.userAppsHashPrefix.concat(':', app.userId);

      return db
      .multi()
      .hmset(appHashKey, _.omit(app, ['id']))
      .sadd(userAppsHashKey, app.id)
      .execAsync()
      .then(function(res) {
        let success = !res.some(function(val) {return !val;});
        if (!success) {
          return Promise.reject(new Error('Failed to create app'))
        }
        return true;
      });
    });
  }

  function get(id) {
    return db.hgetallAsync(config.apps.redis.appHashPrefix.concat(':', id))
    .then(function(app) {
      if (!app || !Object.keys(app).length) {
        return null;
      }
      app['id'] = id;
      return app;
    });
  }

  function getAll(userId) {
    return getAllAppIdsByUser(userId)
    .then(function(appIds) {
      return Promise.all(appIds.map(get));
    });
  }

  function getAllAppIdsByUser(userId) {
    return db.smembersAsync(config.apps.redis.userAppsHashPrefix.concat(':', userId));
  }

  function rotateSecret(id, secret) {
    let appHashKey = config.apps.redis.appHashPrefix.concat(':', id);
    return utils.saltAndHash(secret, config.bcrypt.saltRounds)
    .then(function(hash) {
      return db.hsetAsync(appHashKey, 'secret', hash)
      .then(function(res) {
        return res === 0 ? true : false;
      })
    })
  }

  function authenticate(id, secret) {
    return get(id)
    .then(function(app) {
      if (!app) {
        return null;
      }
      return utils.compareSaltAndHashed(secret, app.secret)
    });
  }

  function remove(id, userId) {
    return db
    .multi()
    .del(config.apps.redis.appHashPrefix.concat(':', id))
    .srem(config.apps.redis.userAppsHashPrefix.concat(':', userId), id)
    .execAsync()
    .then(function(responses) {
      // Respond with true only when all deletes are successful
      return responses.every(function(res) {
        return res;
      });
    });
  }

  function removeAll(userId) {
    return getAllAppIdsByUser(userId)
    .then(function(appIds) {
      let removeAppPromises = appIds.map(function(appId) {
        return remove(appId, userId);
      });
      return Promise.all(removeAppPromises);
    });
  }

  applicationDao = {
    insert: insert,
    authenticate: authenticate,
    get: get,
    getAll: getAll,
    getAllAppIdsByUser: getAllAppIdsByUser,
    rotateSecret: rotateSecret,
    remove: remove,
    removeAll: removeAll
  };

  return applicationDao;
}
