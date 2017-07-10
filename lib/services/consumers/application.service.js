'use strict';

let applicationDao = require('./application.dao.js');
let config = require('../../config');
let utils = require('../utils');
let uuid = require('node-uuid');

let s = {};

s.insert = function (_app, userId) {
  return new Promise((resolve, reject) => {
    let app = validateAndCreateApp(_app, userId);

    return applicationDao.insert(app)
    .then(function (success) {
      if (!success) {
        return reject(new Error('one or more insert operations failed')); // TODO: replace with server error
      }

      app.isActive = app.isActive === 'true';
      return resolve(app);
    });
  })
  .catch(err => Promise.reject(new Error('Failed to insert application: ' + err.message)));
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

s.findAll = function (query) {
  return applicationDao.findAll(query || {}).then(data => {
    data.apps = data.apps || [];
    data.apps.forEach(a => { a.isActive = a.isActive === 'true'; });
    return data;
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
  .then(function (app) {
    return applicationDao.remove(id, app.userId);
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
};

function validateAndCreateApp (appProperties, userId) {
  let app = {};
  let baseAppProps;

  if (!appProperties || !userId) {
    throw new Error('invalid application properties'); // TODO: replace with validation error
  }

  if (!Object.keys(appProperties).every(key => (typeof key === 'string' && !!config.models.applications.properties[key]))) {
    throw new Error('one or more property is invalid'); // TODO: replace with validation error
  }

  baseAppProps = { isActive: 'true', id: uuid.v4(), userId };

  for (let prop in config.models.applications.properties) {
    let descriptor = config.models.applications.properties[prop];
    if (!appProperties[prop]) {
      if (descriptor.isRequired) {
        throw new Error(`${prop} is required`);
      }
      if (descriptor.defaultValue) {
        app[prop] = descriptor.defaultValue;
      }
    } else app[prop] = appProperties[prop];
  }

  app = Object.assign(app, baseAppProps);

  utils.appendCreatedAt(app);
  utils.appendUpdatedAt(app);

  return app;
}

module.exports = s;
