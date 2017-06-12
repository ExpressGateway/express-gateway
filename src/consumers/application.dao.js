'use strict';

let {getDb} = require('../db');
let applicationDao, db, applicationDbConfig;

module.exports = function(config) {
  if (applicationDao) {
    return applicationDao;
  }

  db = getDb();
  applicationDbConfig = config.applications.redis;

  function insert(app) {
    // key for the app hash table
    let appHashKey = applicationDbConfig.appHashPrefix.concat(':', app.id);

    // key for the user-applications hash table
    let userAppsHashKey = applicationDbConfig.userAppsHashPrefix.concat(':', app.userId);

    return db
    .multi()
    .hmset(appHashKey, app)
    .sadd(userAppsHashKey, app.id)
    .execAsync()
    .then(res => res.every(val => val));
  }

  function update(id, props) {
    // key for the app hash table
    let appHashKey = applicationDbConfig.appHashPrefix.concat(':', id);

    return db
    .hmsetAsync(appHashKey, props)
    .then(function(res) {
      return !!res;
    });
  }

  function get(id) {
    return db.hgetallAsync(applicationDbConfig.appHashPrefix.concat(':', id))
    .then(function(app) {
      if (!app || !Object.keys(app).length) {
        return false;
      } else return app;
    });
  }

  function getAll(userId) {
    return getAllAppIdsByUser(userId)
    .then(function(appIds) {
      return Promise.all(appIds.map(get))
      .then(apps => apps.filter(app => app !== false));
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

  function deactivateAll(userId) {
    return getAllAppIdsByUser(userId)
    .then(function(appIds) {
      let deactivateAppPromises = appIds.map(appId => deactivate(appId));
      return Promise.all(deactivateAppPromises)
    });
  }

  function remove(id, userId) {
    return db
    .multi()
    .del(applicationDbConfig.appHashPrefix.concat(':', id))
    .srem(applicationDbConfig.userAppsHashPrefix.concat(':', userId), id)
    .execAsync()
    .then(responses => responses.every(res => res));
  }

  function removeAll(userId) {
    return getAllAppIdsByUser(userId)
    .then(function(appIds) {
      let removeAppPromises = appIds.map(appId => remove(appId, userId));
      return Promise.all(removeAppPromises)
      .then(responses => responses.every(res => res));
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
    deactivateAll,
    remove,
    removeAll
  };

  return applicationDao;
}
