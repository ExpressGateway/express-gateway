'use strict';

const db = require('../../db')();
const config = require('../../config');

const dao = {};

const appNamespace = 'application';
const appnameNamespace = 'application-name';
const userAppsNamespace = 'user-applications';

// key for the app hash table
const appHashKey = (value) => `${config.systemConfig.db.redis.namespace}-${appNamespace}:${value}`;

// key for the user-applications hash table
const userAppsHashKey = (value) => `${config.systemConfig.db.redis.namespace}-${userAppsNamespace}:${value}`;

// key for application name-id hash table
const appNameSetKey = (value) => `${config.systemConfig.db.redis.namespace}-${appnameNamespace}:${value}`;

dao.insert = function (app) {
  return db
    .multi()
    .hmset(appHashKey(app.id), app)
    .sadd(userAppsHashKey(app.userId), app.id)
    .sadd(appNameSetKey(app.name), app.id)
    .execAsync()
    .then(res => res.every(val => val));
};

dao.update = function (id, props) {
  // key for the app hash table
  const hashKey = appHashKey(id);

  return db
    .hmsetAsync(hashKey, props)
    .then(function (res) {
      return !!res;
    });
};

dao.findAll = function (query) {
  const key = appHashKey('');
  const startFrom = query.start || 0;
  return db.scanAsync(startFrom, 'MATCH', key + '*', 'COUNT', '100').then(resp => {
    const nextKey = resp[0];
    const appKeys = resp[1];
    if (!appKeys || appKeys.length === 0) return Promise.resolve({ apps: [], nextKey: 0 });
    const promises = appKeys.map(key => db.hgetallAsync(key));
    return Promise.all(promises).then(apps => {
      return {
        apps,
        nextKey
      };
    });
  });
};

dao.find = function (appName) {
  return db.smembersAsync(appNameSetKey(appName))
    .then(function (Ids) {
      if (Ids && Ids.length !== 0) {
        return Ids[0];
      } else return false;
    });
};

dao.get = function (id) {
  return db.hgetallAsync(appHashKey(id))
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
  return db.smembersAsync(userAppsHashKey(userId));
};

dao.activate = function (id) {
  return db.hmsetAsync(appHashKey(id), ['isActive', 'true', 'updatedAt', String(new Date())]);
};

dao.deactivate = function (id) {
  return db.hmsetAsync(appHashKey(id), ['isActive', 'false', 'updatedAt', String(new Date())]);
};

dao.deactivateAll = function (userId) {
  return this.getAllAppIdsByUser(userId)
    .then(appIds => {
      const deactivateAppPromises = appIds.map(appId => this.deactivate(appId));
      return Promise.all(deactivateAppPromises);
    });
};

dao.remove = function ({ name, id }, userId) {
  return db
    .multi()
    .del(appHashKey(id))
    .srem(userAppsHashKey(userId), id)
    .srem(appNameSetKey(name), id)
    .execAsync()
    .then(responses => responses.every(res => res));
};

dao.removeAll = function (userId) {
  return this.getAllAppIdsByUser(userId)
    .then(appIds => Promise.all(appIds.map(appId => this.get(appId))))
    .then(apps => Promise.all(apps.map(app => this.remove(app, userId))))
    .then(responses => responses.every(res => res));
};

module.exports = dao;
