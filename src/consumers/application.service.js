'use strict';

let getApplicationDao = require('./application.dao.js');
let Promise = require('bluebird');
let utils = require('../utils');
let uuid = require('node-uuid');
let applicationService, applicationDao;

module.exports = function(config) {
  if (applicationService) {
    return applicationService;
  }

  const applicationPropsDefinitions = config.applications.properties;
  applicationDao = getApplicationDao(config);

  function insert(_app, userId) {
    return new Promise((resolve) => {
      let app = validateAndCreateApp(_app, userId);
      return applicationDao.insert(app)
      .then(function() {
        return resolve(app);
      });
    })
    .catch(err => Promise.reject(new Error('Failed to insert application: ' + err.message)));
  }

  function get(id) {
    return applicationDao
    .get(id)
    .then(function(app) {
      return app ? app : Promise.reject(new Error('app not found'));
    });
  }

  function getAll(userId) {
    return applicationDao.getAll(userId)
    .catch(function() {
      return Promise.reject(new Error('failed to get all apps'));
    });
  }

  function remove(id) {
    return get(id) // make sure app exists
    .then(function(app) {
      return applicationDao.remove(id, app.userId);
    })
    .then(function(removed) {
      return removed ? true : Promise.reject(new Error('failed to remove app'));
    });
  }

  function removeAll(userId) {
    return applicationDao.removeAll(userId)
    .then(function(responses) {
      let removed = responses.every(function(res) {
        return res;
      });

      return removed ? true : Promise.reject(new Error('failed to remove all apps'));
    })
    .catch(function() {
      return Promise.reject(new Error('failed to get all apps'));
    });
  }

  function validateAndCreateApp(appProperties, userId) {
    let app = {};
    let baseAppProps;

    if (!appProperties || !userId) {
      throw new Error('invalid application properties');
    }

    if (!Object.keys(appProperties).every(key => (typeof key === 'string' && !!applicationPropsDefinitions[key]))) {
      throw new Error('one or more property is invalid');
    }

    baseAppProps = { id: uuid.v4(), userId };

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

  applicationService = {
    insert,
    get,
    getAll,
    remove,
    removeAll
  };

  return applicationService;
}
