const db = require('../../db');
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
  const addApp = () => {
    return db
      .multi()
      .hmset(appHashKey(app.id), app)
      .sadd(userAppsHashKey(app.userId), app.id)
      .sadd(appNameSetKey(app.name), app.id)
      .exec()
      .then(res => res.every(val => val));
  };

  return dao.find(app.name).then(appId => {
    if (appId) {
      return dao.get(appId).then((possibleApp) => {
        if (possibleApp.userId === app.userId) {
          throw new Error(`${app.userId} has already another application bound with ${app.name} as name`);
        }

        return addApp();
      });
    }

    return addApp();
  });
};

dao.update = function (id, props) {
  // key for the app hash table
  const hashKey = appHashKey(id);

  return db
    .hmset(hashKey, props)
    .then(function (res) {
      return !!res;
    });
};

dao.findAll = function ({ start = 0, count = '100' } = {}) {
  const key = appHashKey('');
  return db.scan(start, 'MATCH', `${key}*`, 'COUNT', count).then(resp => {
    const nextKey = parseInt(resp[0], 10);
    const appKeys = resp[1];
    if (!appKeys || appKeys.length === 0) return Promise.resolve({ apps: [], nextKey: 0 });
    const promises = appKeys.map(key => db.hgetall(key));
    return Promise.all(promises).then(apps => {
      return {
        apps,
        nextKey
      };
    });
  });
};

dao.find = function (appName) {
  return db.smembers(appNameSetKey(appName))
    .then(function (Ids) {
      if (Ids && Ids.length !== 0) {
        if (Ids.length === 1) {
          return Ids[0];
        }
        throw new Error(`Multiple applications with ${appName} have been found: ${Ids.join(',')}.
                         Please search for it using its ID instead`);
      } else {
        return false;
      }
    });
};

dao.get = function (id) {
  return db.hgetall(appHashKey(id))
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
  return db.smembers(userAppsHashKey(userId));
};

dao.activate = function (id) {
  return db.hmset(appHashKey(id), { isActive: 'true', updatedAt: String(new Date()) });
};

dao.deactivate = function (id) {
  return db.hmset(appHashKey(id), { isActive: 'false', updatedAt: String(new Date()) });
};

dao.deactivateAll = function (userId) {
  return this.getAllAppIdsByUser(userId)
    .then(appIds => {
      const deactivateAppPromises = appIds.map(appId => this.deactivate(appId));
      return Promise.all(deactivateAppPromises);
    });
};

dao.remove = function ({ name, id, userId }) {
  return db
    .multi()
    .del(appHashKey(id))
    .srem(userAppsHashKey(userId), id)
    .srem(appNameSetKey(name), id)
    .exec()
    .then(responses => responses.every(res => res));
};

dao.removeAll = function (userId) {
  return this.getAllAppIdsByUser(userId)
    .then(appIds => {
      const removeAppPromises = appIds.map(appId => {
        return this.get(appId).then((app) => this.remove(app));
      });
      return Promise.all(removeAppPromises)
        .then(responses => responses.every(res => res));
    });
};

module.exports = dao;
