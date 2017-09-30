const _ = require('lodash');
const config = require('../../config');
const db = require('../../db')();

const namespaces = {
  APP: 'app',
  USER_APPS: 'user-apps'
};

const buildKey = (namespace, id = '') => config
  .systemConfig
  .db
  .redis
  .namespace
  .concat('-', namespace)
  .concat(':', id);

const buildAppKey = (id = '') => buildKey(namespaces.APP, id);
const buildUserAppsKey = (id = '') => buildKey(namespaces.USER_APPS, id);

module.exports = {
  insert (app) {
    const result = db.multi()
      .hmset(buildAppKey(app.id), app)
      .sadd(buildUserAppsKey(app.userId), app.id);

    return result
      .execAsync()
      .then(res => res.every(val => val));
  },

  update (id, props) {
    return db
      .hmsetAsync(buildAppKey(id), props)
      .then(res => !!res);
  },

  findAll (filters = {}, currentCursor = 0, limit = 100) {
    const pattern = {};

    if (filters.name) {
      pattern.name = filters.name;
    }

    let appKeysPromise;
    let nextCursor = 0;

    if (filters.userId) {
      appKeysPromise = db
        .smembersAsync(buildUserAppsKey(filters.userId))
        .then(appIds => appIds
          .filter(appId => !!appId)
          .map(buildAppKey)
        );
    } else {
      appKeysPromise = db
        .scanAsync(currentCursor, 'MATCH', buildAppKey('*'), 'COUNT', limit)
        .then(resp => {
          nextCursor = resp[0];
          return _.isArray(resp[1]) && resp[1].length ? resp[1] : [];
        });
    }

    return appKeysPromise
      .then(appKeys => Promise.all(
        appKeys.map(appKey => db.hgetallAsync(appKey))
      ))
      .then(apps => !_.size(pattern) ? apps : _.filter(apps, pattern))
      .then(apps => ({
        apps,
        nextCursor
      }));
  },

  get (id) {
    return db
      .hgetallAsync(buildAppKey(id))
      .then((app) => {
        if (!app || !Object.keys(app).length) {
          return false;
        }

        return app;
      });
  },

  getAll (userId) {
    return this
      .getAllAppIdsByUser(userId)
      .then(appIds => Promise
        .all(appIds.map(appId => this.get(appId)))
        .then(apps => apps.filter(app => !!app))
      );
  },

  getAllAppIdsByUser (userId) {
    return db.smembersAsync(buildUserAppsKey(userId));
  },

  activate (id) {
    return this.toggle(id, true);
  },

  deactivate (id) {
    return this.toggle(id, false);
  },

  toggle (id, isActive) {
    return db
      .hmsetAsync(buildAppKey(id), [
        'isActive',
        isActive ? 'true' : 'false',
        'updatedAt',
        (new Date()).toString()
      ]);
  },

  deactivateAll (userId) {
    return this
      .getAllAppIdsByUser(userId)
      .then(appIds => Promise.all(appIds.map(appId => this.deactivate(appId))));
  },

  remove (id, userId) {
    return db
      .multi()
      .del(buildAppKey(id))
      .srem(buildUserAppsKey(userId), id)
      .execAsync()
      .then(res => res.every(res => res));
  },

  removeAll (userId) {
    return this
      .getAllAppIdsByUser(userId)
      .then(appIds => Promise
        .all(appIds.map(appId => this.remove(appId, userId)))
        .then(res => res.every(res => res))
      );
  }
};
