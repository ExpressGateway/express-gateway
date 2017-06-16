'use strict';

let db = require('../../db')();
let redisConfig = require('../../config/config.redis.js').applications;

let dao = {};

dao.insert = function (app) {
  // key for the app hash table
  let appHashKey = redisConfig.appHashPrefix.concat(':', app.id);

  // key for the user-applications hash table
  let userAppsHashKey = redisConfig.userAppsHashPrefix.concat(':', app.userId);

  return db
  .multi()
  .hmset(appHashKey, app)
  .sadd(userAppsHashKey, app.id)
  .execAsync()
  .then(res => res.every(val => val));
};

dao.update = function (id, props) {
  // key for the app hash table
  let appHashKey = redisConfig.appHashPrefix.concat(':', id);

  return db
  .hmsetAsync(appHashKey, props)
  .then(function (res) {
    return !!res;
  });
};

dao.get = function (id) {
  return db.hgetallAsync(redisConfig.appHashPrefix.concat(':', id))
  .then(function (app) {
    if (!app || !Object.keys(app).length) {
      return false;
    } else return app;
  });
};

dao.getAll = function (userId) {
  return this.getAllAppIdsByUser(userId)
  .then(appIds => {
    return Promise.all(appIds.map(this.get))
    .then(apps => apps.filter(app => app !== false));
  });
};

dao.getAllAppIdsByUser = function (userId) {
  return db.smembersAsync(redisConfig.userAppsHashPrefix.concat(':', userId));
};

dao.activate = function (id) {
  return db.hsetAsync(redisConfig.appHashPrefix.concat(':', id), 'isActive', 'true');
};

dao.deactivate = function (id) {
  return db.hsetAsync(redisConfig.appHashPrefix.concat(':', id), 'isActive', 'false');
};

dao.deactivateAll = function (userId) {
  return this.getAllAppIdsByUser(userId)
  .then(appIds => {
    let deactivateAppPromises = appIds.map(appId => this.deactivate(appId));
    return Promise.all(deactivateAppPromises);
  });
};

dao.remove = function (id, userId) {
  return db
  .multi()
  .del(redisConfig.appHashPrefix.concat(':', id))
  .srem(redisConfig.userAppsHashPrefix.concat(':', userId), id)
  .execAsync()
  .then(responses => responses.every(res => res));
};

dao.removeAll = function (userId) {
  return this.getAllAppIdsByUser(userId)
  .then(appIds => {
    let removeAppPromises = appIds.map(appId => this.remove(appId, userId));
    return Promise.all(removeAppPromises)
    .then(responses => responses.every(res => res));
  });
};

module.exports = dao;
