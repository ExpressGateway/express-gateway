const uuidv4 = require('uuid/v4');
const { validate } = require('../../../lib/schemas');
const applicationDao = require('./application.dao.js');
const config = require('../../config');
const utils = require('../utils');

const SCHEMA = 'http://express-gateway.io/models/applications.json';

const s = {};

s.insert = function (_app, userId) {
  try {
    return validateAndCreateApp(_app, userId)
      .then((app) => Promise.all([app, applicationDao.insert(app)]))
      .then(function ([app, success]) {
        if (!success) {
          throw new Error('one or more insert operations failed'); // TODO: replace with server error
        }

        app.isActive = app.isActive === 'true';
        return app;
      }).catch(err => {
        throw new Error('Failed to insert application: ' + err.message);
      });
  } catch (err) {
    return Promise.reject(err);
  }
};

s.get = function (id) {
  return applicationDao.get(id)
    .then(app => {
      if (!app) {
        return false;
      }

      app.isActive = (app.isActive === 'true');
      return app;
    });
};

s.find = function (appName) {
  if (!appName || !typeof appName === 'string') {
    return Promise.reject(new Error('invalid appName')); // TODO: replace with validation error
  }

  return applicationDao
    .find(appName)
    .then(app => {
      return app ? this.get(app) : false;
    });
};

s.findAll = function (query) {
  return applicationDao.findAll(query).then(data => {
    data.apps = data.apps || [];
    data.apps.forEach(a => { a.isActive = a.isActive === 'true'; });
    return data;
  });
};

s.findByNameOrId = function (value) {
  return s
    .get(value)
    .then((application) => {
      if (application) {
        return application;
      }

      return s.find(value);
    });
};

s.getAll = function (userId) {
  return applicationDao.getAll(userId)
    .then(apps => {
      return apps.map(app => {
        app.isActive = app.isActive === 'true';
        return app;
      });
    });
};

s.remove = function (id) {
  return this.get(id) // make sure app exists
    .then(app => {
      if (!app) {
        return Promise.reject(new Error('app not found, failed to remove'));
      }
      return applicationDao.remove(app);
    })
    .then(function (removed) {
      return removed ? true : Promise.reject(new Error('failed to remove app')); // TODO: replace with server error
    });
};

s.deactivate = function (id) {
  return this.get(id) // make sure app exists
    .then(function () {
      return applicationDao.deactivate(id);
    })
    .then(() => true)
    .catch(() => Promise.reject(new Error('failed to deactivate application')));
};

s.deactivateAll = function (userId) {
  return applicationDao.deactivateAll(userId)
    .then(() => true)
    .catch(() => Promise.reject(new Error('failed to deactivate all applications')));
};

s.activate = function (id) {
  return this.get(id) // make sure app exists
    .then(function () {
      return applicationDao.activate(id);
    })
    .then(() => true)
    .catch(() => Promise.reject(new Error('failed to activate user')));
};

s.removeAll = function (userId) {
  return applicationDao.removeAll(userId)
    .then(removed => {
      return removed ? true : Promise.reject(new Error('failed to remove all apps')); // TODO: replace with server error
    });
};

s.update = function (id, applicationProperties) {
  const updatedAppProperties = {};

  if (!applicationProperties || !id) {
    return Promise.reject(new Error('invalid properties')); // TODO: replace with validation error
  }

  return this.get(id) // validate app exists
    .then(function () {
      if (!Object.keys(applicationProperties).every(key => typeof key === 'string' && config.models.applications.properties[key])) {
        return Promise.reject(new Error('one or more properties is invalid')); // TODO: replace with validation error
      }

      for (const prop in applicationProperties) {
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
};

function validateAndCreateApp (appProperties, userId) {
  if (!appProperties || !userId) {
    throw new Error('Failed to insert application: invalid application properties'); // TODO: replace with validation error
  }

  const result = validate(SCHEMA, appProperties);
  if (!result.isValid) {
    throw new Error(result.error);
  }

  const userService = require('../consumers/user.service');
  return userService.get(userId)
    .then((user) => {
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      if (!Object.keys(appProperties).every(key => (typeof key === 'string' && !!config.models.applications.properties[key]))) {
        throw new Error('Failed to insert application: one or more property is invalid'); // TODO: replace with validation error
      }

      const baseAppProps = { isActive: 'true', id: uuidv4(), userId };

      const app = Object.assign(appProperties, baseAppProps);

      utils.appendCreatedAt(app);
      utils.appendUpdatedAt(app);

      return app;
    });
}

module.exports = s;
