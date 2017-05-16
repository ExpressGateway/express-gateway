'use strict';

let getApplicationDao = require('./application.dao.js');
let _ = require('lodash');
let Promise = require('bluebird');
let utils = require('./utils');
let uuid = require('node-uuid');
let applicationService, applicationDao;

module.exports = function(config) {
  if (applicationService) {
    return applicationService;
  }

  const applicationPropsDefinitions = {
    name:   { type: 'string', isMutable: true, userDefined: true  },
    id:     { type: 'string', isMutable: false, userDefined: false },
    secret: { type: 'string', isMutable: true, userDefined: false  },
    userId: { type: 'string', isMutable: false, userDefined: true }
  };

  applicationDao = getApplicationDao(config);

  function insert(_app) {
    let app;
    return validateAndCreateApp(_app)
    .then(function(newApp) {
      app = newApp;
      return applicationDao.insert(app)
      .then(function() {
        return app;
      });
    });
  }

  function authenticate(id, secret) {
    if (!id || !secret) {
      return Promise.reject(new Error('invalid credentials'));
    }

    return applicationDao.authenticate(id, secret)
    .then(function(authenticated) {
      return authenticated ? true : false;
    });
  }

  function get(id) {
    return applicationDao
    .get(id)
    .then(function(app) {
      return app ? _.omit(app, ['secret']) : Promise.reject(new Error('app not found'));
    });
  }

  function getAll(userId) {
    return applicationDao.getAll(userId)
    .catch(function() {
      return Promise.reject(new Error('failed to get all apps'));
    });
  }

  function rotateSecret(id) {
    let newSecret = uuid.v4();
    return get(id) // make sure app exists
    .then(function() {
      return applicationDao.rotateSecret(id, newSecret);
    })
    .then(function(rotated) {
      return rotated ? newSecret : Promise.reject(new Error('rotate secret operation failed'));
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

  /**
   * Helper function to insert. 
   * Creates an app object with the correct schema.
   * @param  {Object}
   * @return {Object}
   */
  function validateAndCreateApp(_app) {
    let app;

    return Promise.resolve()
    .then(function() {
      if (!_app || !_app.name || !_app.userId) {
        return Promise.reject(new Error('invalid app object'));
      }

      // validate application properties
      for (let key in _app) {
        if (!(applicationPropsDefinitions.hasOwnProperty(key) && 
              applicationPropsDefinitions[key].userDefined && 
              typeof _app[key] === applicationPropsDefinitions[key]['type'])) {
          return Promise.reject(new Error('invalid application property'));
        }
      }

      app = {
        name: _app.name,
        id: uuid.v4(),
        secret: uuid.v4(),
        userId: _app.userId
      };

      utils.appendCreatedAt(app);
      utils.appendUpdatedAt(app);

      return app;
    });
  }


  applicationService = {
    insert: insert,
    authenticate: authenticate,
    get: get,
    getAll: getAll,
    rotateSecret: rotateSecret,
    remove: remove,
    removeAll: removeAll
  };

  return applicationService;
}
