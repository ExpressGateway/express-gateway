'use strict';

let _ = require('lodash');
let getDb = require('../db');
let Promise = require('bluebird');
let applicationDao, db, applicationDbConfig;

module.exports = function(config) {
  if (applicationDao) {
    return applicationDao;
  }

  db = getDb(config.redis.host, config.redis.port);
  applicationDbConfig = config.applications.redis;

  /**
   * Insert application to the database. Application should be searchable by its ID.
   * @param  {Object}  app
   * @return {bool}    success
   */
  function insert(app) {
    // key for the app hash table
    let appHashKey = applicationDbConfig.appHashPrefix.concat(':', app.id);

    // key for the user-applications hash table
    let userAppsHashKey = applicationDbConfig.userAppsHashPrefix.concat(':', app.userId);

    return db
    .multi()
    .hmset(appHashKey, _.omit(app, ['id']))
    .sadd(userAppsHashKey, app.id)
    .execAsync()
    .then(function(res) {
      let success = res.every(function(val) {return val;});
      if (!success) {
        return Promise.reject(new Error('Failed to create app'))
      }
      return true;
    });
  }

  function update(id, props) {
    // key for the app hash table
    let appHashKey = applicationDbConfig.appHashPrefix.concat(':', id);

    return db
    .hmsetAsync(appHashKey, props)
    .then(function(res) {
      if (!res) {
        return Promise.reject(new Error('Failed to update app'))
      }
      return true;
    });
  }

  function get(id) {
    return db.hgetallAsync(applicationDbConfig.appHashPrefix.concat(':', id))
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
    return db.smembersAsync(applicationDbConfig.userAppsHashPrefix.concat(':', userId));
  }

  function activate(id) {
    return db.hsetAsync(config.applications.redis.appHashPrefix.concat(':', id), 'isActive', 'true');
  }

  function deactivate(id) {
    return db.hsetAsync(config.applications.redis.appHashPrefix.concat(':', id), 'isActive', 'false');
  }

  function remove(id, userId) {
    return db
    .multi()
    .del(applicationDbConfig.appHashPrefix.concat(':', id))
    .srem(applicationDbConfig.userAppsHashPrefix.concat(':', userId), id)
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
    insert,
    update,
    get,
    getAll,
    getAllAppIdsByUser,
    activate,
    deactivate,
    remove,
    removeAll
  };

  return applicationDao;
}
