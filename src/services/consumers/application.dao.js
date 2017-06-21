'use strict';

let db = require('../../db')();
let config = require('../../config');

let dao = {};

const appNamespace = 'application';
const userAppsNamespace = 'user-applications';

dao.insert = function (app) {
  // key for the app hash table
  let appHashKey = config.systemConfig.db.redis.namespace.concat('-', appNamespace).concat(':', app.id);

  // key for the user-applications hash table
  let userAppsHashKey = config.systemConfig.db.redis.namespace.concat('-', userAppsNamespace).concat(':', app.userId);

  return db
  .multi()
  .hmset(appHashKey, app)
  .sadd(userAppsHashKey, app.id)
  .execAsync()
  .then(res => res.every(val => val));
};

dao.update = function (id, props) {
  // key for the app hash table
  let appHashKey = config.systemConfig.db.redis.namespace.concat('-', appNamespace).concat(':', id);

  return db
  .hmsetAsync(appHashKey, props)
  .then(function (res) {
    return !!res;
  });
};

dao.get = function (id) {
  return db.hgetallAsync(config.systemConfig.db.redis.namespace.concat('-', appNamespace).concat(':', id))
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
  return db.smembersAsync(config.systemConfig.db.redis.namespace.concat('-', userAppsNamespace).concat(':', userId));
};

dao.activate = function (id) {
  return db.hsetAsync(config.systemConfig.db.redis.namespace.concat('-', appNamespace).concat(':', id), 'isActive', 'true');
};

dao.deactivate = function (id) {
  return db.hsetAsync(config.systemConfig.db.redis.namespace.concat('-', appNamespace).concat(':', id), 'isActive', 'false');
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
  .del(config.systemConfig.db.redis.namespace.concat('-', appNamespace).concat(':', id))
  .srem(config.systemConfig.db.redis.namespace.concat('-', userAppsNamespace).concat(':', userId), id)
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
