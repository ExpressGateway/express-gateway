'use strict';

let getApplicationDao = require('./application.dao.js');
let Promise = require('bluebird');
let utils = require('../utils');
let uuid = require('node-uuid');
let applicationDao;

module.exports = function(config) {
  const applicationPropsDefinitions = config.applications.properties;
  applicationDao = getApplicationDao(config);

  function insert(_app, userId) {
    return new Promise((resolve, reject) => {
      let app = validateAndCreateApp(_app, userId);
      return applicationDao.insert(app)
      .then(function(success) {
        return success ? resolve(app) : reject('one or more insert operations failed'); // TODO: replace with server error
      });
    })
    .catch(err => Promise.reject(new Error('Failed to insert application: ' + err.message)));
  }

  function get(id) {
    return applicationDao.get(id);
  }

  function getAll(userId) {
    return applicationDao.getAll(userId)
  }

  function remove(id) {
    return get(id) // make sure app exists
    .then(function(app) {
      return applicationDao.remove(id, app.userId);
    })
    .then(function(removed) {
      return removed ? true : Promise.reject(new Error('failed to remove app')); // TODO: replace with server error
    });
  }

  function deactivate(id) {
    return get(id) // make sure app exists
    .then(function() {
      return applicationDao.deactivate(id);
    })
    .return(true)
    .catch(() => Promise.reject(new Error('failed to deactivate application')));
  }

  function activate(id) {
    return get(id) // make sure app exists
    .then(function() {
      return applicationDao.activate(id);
    })
    .return(true)
    .catch(() => Promise.reject(new Error('failed to activate user')));
  }

  function removeAll(userId) {
    return applicationDao.removeAll(userId)
    .then(removed => {
      return removed ? true : Promise.reject(new Error('failed to remove all apps')); // TODO: replace with server error
    });
  }

  function update(id, applicationProperties) {
    let updatedAppProperties = {};

    if (!applicationProperties || !id) {
      return Promise.reject(new Error('invalid properties')); // TODO: replace with validation error
    }

    return get(id) // validate app exists
    .then(function() {
      if (!Object.keys(applicationProperties).every(key => typeof key === 'string' && applicationPropsDefinitions[key])) {
        return Promise.reject(new Error('one or more properties is invalid')); // TODO: replace with validation error
      }

      for (let prop in applicationProperties) {
        if (applicationPropsDefinitions[prop].isMutable !== false) {
          updatedAppProperties[prop] = applicationProperties[prop];
        } else return Promise.reject(new Error('invalid property ' + prop)); // TODO: replace with validation error
      }

      utils.appendUpdatedAt(updatedAppProperties);
      return applicationDao.update(id, updatedAppProperties);
    })
    .then(function(updated) {
      return updated ? true : Promise.reject(new Error('app update failed')); // TODO: replace with server error
    });
  }

  function validateAndCreateApp(appProperties, userId) {
    let app = {};
    let baseAppProps;

    if (!appProperties || !userId) {
      throw new Error('invalid application properties'); // TODO: replace with validation error
    }

    if (!Object.keys(appProperties).every(key => (typeof key === 'string' && !!applicationPropsDefinitions[key]))) {
      throw new Error('one or more property is invalid'); // TODO: replace with validation error
    }

    baseAppProps = { isActive: 'true', id: uuid.v4(), userId };

    for (let prop in applicationPropsDefinitions) {
      let descriptor = applicationPropsDefinitions[prop];
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

  return {
    insert,
    update,
    get,
    getAll,
    activate,
    deactivate,
    remove,
    removeAll
  };
}