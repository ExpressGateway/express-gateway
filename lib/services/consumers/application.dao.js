const config = require('../../config');
const db = require('../../db')();

const namespaces = {
  APP: 'app',
  USER_APPS: 'user-apps',
  APP_NAME: 'app-name'
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
const buildAppNameKey = (id = '') => buildKey(namespaces.APP_NAME, id);

module.exports = {
  insert (app) {
    const result = db.multi()
      .hmset(buildAppKey(app.id), app)
      .sadd(buildUserAppsKey(app.userId), app.id);

    if (app.name) {
      result.set(buildAppNameKey(app.name), app.id);
    }

    return result
      .execAsync()
      .then(res => res.every(val => val));
  },

  isNameUnique (name) {
    return db.getAsync(buildAppNameKey(name))
      .then(res => !res);
  },

  getId (nameOrId) {
    return db.getAsync(buildAppNameKey(nameOrId))
      .then(res => res || nameOrId)
      .catch(() => nameOrId);
  },

  update (nameOrId, props) {
    return this.getId(nameOrId)
      .then(id => db
        .hmsetAsync(buildAppKey(id), props)
        .then(res => !!res)
      );
  },

  findAll (query) {
    const startFrom = query.start || 0;
    return db
      .scanAsync(startFrom, 'MATCH', buildAppKey('*'), 'COUNT', '100')
      .then(resp => {
        const nextKey = resp[0];
        const appKeys = resp[1];

        if (!appKeys || appKeys.length === 0) {
          return Promise.resolve({
            apps: [],
            nextKey: 0
          });
        }

        return Promise
          .all(appKeys.map(key => db.hgetallAsync(key)))
          .then(apps => ({
            apps,
            nextKey
          }));
      });
  },

  get (nameOrId) {
    return this
      .getId(nameOrId)
      .then(id => db
        .hgetallAsync(buildAppKey(id))
        .then((app) => {
          if (!app || !Object.keys(app).length) {
            return false;
          }

          return app;
        })
      );
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

  activate (nameOrId) {
    return this.toggle(nameOrId, true);
  },

  deactivate (nameOrId) {
    return this.toggle(nameOrId, false);
  },

  toggle (nameOrId, isActive) {
    return this
      .getId(nameOrId)
      .then(id => db.hmsetAsync(buildAppKey(id), [
        'isActive',
        isActive ? 'true' : 'false',
        'updatedAt',
        (new Date()).toString()
      ]));
  },

  deactivateAll (userId) {
    return this
      .getAllAppIdsByUser(userId)
      .then(appIds => Promise.all(appIds.map(appId => this.deactivate(appId))));
  },

  remove (nameOrId, userId) {
    return this
      .getId(nameOrId)
      .then(id => db
        .multi()
        .del(buildAppKey(id))
        .srem(buildUserAppsKey(userId), id)
        .execAsync()
        .then(res => res.every(res => res))
      );
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
