const _ = require('lodash');
const uuidv4 = require('uuid/v4');
const applicationDao = require('./application.dao.js');
const config = require('../../config');
const utils = require('../utils');

module.exports = {
  validateAndCreate (properties, userId) {
    return new Promise((resolve, reject) => {
      if (!properties) {
        reject(new Error('invalid application properties')); // TODO: replace with validation error
        return;
      }

      if (!userId) {
        reject(new Error('userId is required'));
        return;
      }

      if (!properties.name) {
        reject(new Error('name is required'));
        return;
      }
      const keys = Object.keys(_.omit(properties, 'name'));

      if (_.size(keys) && !keys.every(key => (typeof key === 'string' && !!config.models.applications.properties[key]))) {
        reject(new Error('one or more property is invalid')); // TODO: replace with validation error
        return;
      }

      const app = {};

      for (const prop in config.models.applications.properties) {
        const descriptor = config.models.applications.properties[prop];
        if (!properties[prop]) {
          if (descriptor.isRequired) {
            reject(new Error(`${prop} is required`));
            return;
          }

          if (descriptor.defaultValue) {
            app[prop] = descriptor.defaultValue;
          }
        } else {
          app[prop] = properties[prop];
        }
      }

      Object.assign(app, {
        name: properties.name,
        isActive: 'true',
        id: uuidv4(),
        userId
      });

      utils.appendCreatedAt(app);
      utils.appendUpdatedAt(app);
      resolve(app);
    });
  },

  insert (properties, userId) {
    return this
      .validateAndCreate(properties, userId)
      .then(app => applicationDao
        .insert(app)
        .then((success) => {
          if (!success) {
            throw new Error('one or more insert operations failed');
          }

          app.isActive = app.isActive === 'true';
          return app;
        })
      )
      .catch(err => Promise.reject(new Error('Failed to insert application: ' + err.message)));
  },

  get (id) {
    return applicationDao.get(id)
      .then(app => {
        if (!app) {
          return false;
        }

        app.isActive = (app.isActive === 'true');
        return app;
      });
  },

  findAll (query) {
    return applicationDao.findAll(query || {}).then(data => {
      data.apps = data.apps || [];
      data.apps.forEach(a => { a.isActive = a.isActive === 'true'; });
      return data;
    });
  },

  getAll (userId) {
    return applicationDao.getAll(userId)
      .then(apps => apps.map(app => {
        app.isActive = app.isActive === 'true';
        return app;
      }));
  },

  remove (id) {
    return this.get(id) // make sure app exists
      .then(app => applicationDao.remove(id, app.userId))
      .then(removed => removed ? true : Promise.reject(new Error('failed to remove app'))); // TODO: replace with server error
  },

  deactivate (id) {
    return this.get(id) // make sure app exists
      .then(() => applicationDao.deactivate(id))
      .then(() => true)
      .catch(() => Promise.reject(new Error('failed to deactivate application')));
  },

  deactivateAll (userId) {
    return applicationDao.deactivateAll(userId)
      .then(() => true)
      .catch(() => Promise.reject(new Error('failed to deactivate all applications')));
  },

  activate (id) {
    return this.get(id) // make sure app exists
      .then(() => applicationDao.activate(id))
      .then(() => true)
      .catch(() => Promise.reject(new Error('failed to activate user')));
  },

  removeAll (userId) {
    return applicationDao.removeAll(userId)
      .then(removed => removed ? true : Promise.reject(new Error('failed to remove all apps'))); // TODO: replace with server error
  },

  update (id, properties) {
    const updatedAppProperties = {};

    if (!properties || !id) {
      return Promise.reject(new Error('invalid properties')); // TODO: replace with validation error
    }

    return this
      .get(id) // validate app exists
      .then(() => {
        const keys = Object.keys(_.omit(properties, 'name'));
        if (!keys.every(key => typeof key === 'string' && config.models.applications.properties[key])) {
          return Promise.reject(new Error('one or more properties is invalid')); // TODO: replace with validation error
        }

        for (const prop of keys) {
          if (config.models.applications.properties[prop].isMutable !== false) {
            updatedAppProperties[prop] = properties[prop];
          } else {
            return Promise.reject(new Error('invalid property ' + prop)); // TODO: replace with validation error
          }
        }

        utils.appendUpdatedAt(updatedAppProperties);
        return applicationDao.update(id, updatedAppProperties);
      })
      .then(updated => updated ? true : Promise.reject(new Error('app update failed'))); // TODO: replace with server error
  }
};
