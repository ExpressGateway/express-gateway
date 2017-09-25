const uuidv4 = require('uuid/v4');
const applicationDao = require('./application.dao.js');
const config = require('../../config');
const utils = require('../utils');

module.exports = {
  validateAndCreate (properties, userId) {
    const promise = new Promise((resolve, reject) => {
      if (!properties || !userId) {
        reject(new Error('invalid application properties')); // TODO: replace with validation error
        return;
      }

      if (!Object.keys(properties).every(key => (typeof key === 'string' && !!config.models.applications.properties[key]))) {
        reject(new Error('one or more property is invalid')); // TODO: replace with validation error
        return;
      }

      const app = {};

      for (let prop in config.models.applications.properties) {
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
        isActive: 'true',
        id: uuidv4(),
        userId
      });

      utils.appendCreatedAt(app);
      utils.appendUpdatedAt(app);
      resolve(app);
    });

    return promise.then(app => {
      if (app.name) {
        return applicationDao
          .isNameUnique(app.name)
          .then((isUnique) => isUnique ? app : Promise.reject(
            new Error('application already exists')
          ));
      }

      return app;
    });
  },

  insert (properties, userId) {
    return this
      .validateAndCreate(properties, userId)
      .then(app => {
        return applicationDao
          .insert(app)
          .then((success) => {
            if (!success) {
              throw new Error('one or more insert operations failed');
            }

            app.isActive = app.isActive === 'true';
            return app;
          });
      })
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
      .then(apps => {
        return apps.map(app => {
          app.isActive = app.isActive === 'true';
          return app;
        });
      });
  },

  remove (id) {
    return this.get(id) // make sure app exists
      .then(function (app) {
        return applicationDao.remove(id, app.userId);
      })
      .then(function (removed) {
        return removed ? true : Promise.reject(new Error('failed to remove app')); // TODO: replace with server error
      });
  },

  deactivate (id) {
    return this.get(id) // make sure app exists
      .then(function () {
        return applicationDao.deactivate(id);
      })
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
      .then(function () {
        return applicationDao.activate(id);
      })
      .then(() => true)
      .catch(() => Promise.reject(new Error('failed to activate user')));
  },

  removeAll (userId) {
    return applicationDao.removeAll(userId)
      .then(removed => {
        return removed ? true : Promise.reject(new Error('failed to remove all apps')); // TODO: replace with server error
      });
  },

  update (id, applicationProperties) {
    let updatedAppProperties = {};

    if (!applicationProperties || !id) {
      return Promise.reject(new Error('invalid properties')); // TODO: replace with validation error
    }

    return this.get(id) // validate app exists
      .then(function () {
        if (!Object.keys(applicationProperties).every(key => typeof key === 'string' && config.models.applications.properties[key])) {
          return Promise.reject(new Error('one or more properties is invalid')); // TODO: replace with validation error
        }

        for (let prop in applicationProperties) {
          if (config.models.applications.properties[prop].isMutable !== false) {
            updatedAppProperties[prop] = applicationProperties[prop];
          } else return Promise.reject(new Error('invalid property ' + prop)); // TODO: replace with validation error
        }

        utils.appendUpdatedAt(updatedAppProperties);
        return applicationDao.update(id, updatedAppProperties);
      })
      .then(function (updated) {
        return updated ? true : Promise.reject(new Error('app update failed')); // TODO: replace with server error
      });
  }
};
