'use strict';

let getUserDao = require('./user.dao.js');
let getApplicationService = require('./application.service.js');
let getCredentialService = require('../credentials');
let _ = require('lodash');
let Promise = require('bluebird');
let utils = require('../utils');
let uuid = require('node-uuid');
let userDao, applicationService, credentialService;

module.exports = function(config) {
  const userPropsDefinitions = config.users.properties;

  userDao = getUserDao(config);
  applicationService = getApplicationService(config);
  credentialService = getCredentialService(config);

  function insert(user) {
    return validateAndCreateUser(user)
    .then(function(newUser) {
      return userDao.insert(newUser)
      .then(function(success) {
        if (success) {
          return {
            username: newUser.username,
            id: newUser.id,
            createdAt: newUser.createdAt
          }
        } else return Promise.reject(new Error('insert user failed')); // TODO: replace with server error
      });
    });
  }

  function get(userId, options) {
    if (!userId || !typeof userId === 'string') {
      return false;
    }

    return userDao
    .getUserById(userId)
    .then(function(user) {
      if (!user) {
        return false;
      }
      return (options && options.includePassword) ? user : _.omit(user, ['password']);
    });
  }

  function find(username, options) {
    if (!username || !typeof username === 'string') {
      return Promise.reject(new Error('invalid username')); // TODO: replace with validation error
    }

    return userDao
    .find(username)
    .then(function(userId) {
      return userId ? get(userId, options) : false;
    });
  }

  function update(userId, _props) {
    if (!_props || !userId) {
      return Promise.reject(new Error('invalid user id')); // TODO: replace with validation error
    }

    return get(userId) // validate user exists
    .then(user => {
      return !user ? false : // user does not exist
      validateUpdateToUserProperties(_.omit(_props, ['username']))
      .then(function(updatedUserProperties){
        if (updatedUserProperties) {
          utils.appendUpdatedAt(updatedUserProperties);
          return userDao.update(userId, updatedUserProperties);
        } else return true; // there are no properties to update
      })
      .then(updated =>  {
        return updated ? true : Promise.reject(new Error('user update failed')); // TODO: replace with server error
      });
    });
  }

  function deactivate(id) {
    return get(id) // make sure user exists
    .then(function() {
      return userDao.deactivate(id);
    })
    .return(true)
    .catch(() => Promise.reject(new Error('failed to deactivate user')));
  }

  function activate(id) {
    return get(id) // make sure user exists
    .then(function() {
      return userDao.activate(id);
    })
    .return(true)
    .catch(() => Promise.reject(new Error('failed to deactivate user')));
  }

  function remove(userId) {
    return get(userId) // validate user exists
    .then(function(user) {
      return !user ? false : // user does not exist
      userDao.remove(userId)
      .then(function(userDeleted) {
        if (!userDeleted) {
          return Promise.reject(new Error('user delete failed')); // TODO: replace with server error
        } else {
          return Promise.all([ applicationService.removeAll(userId), // Cascade delete all apps associated with user
                               credentialService.removeAllCredentials(user.username)]) // Cascade delete all user credentials
          .catch(() => Promise.reject(new Error('failed to delete user\'s applications or credentials'))) // TODO: replace with server error
          .return(true);
        }
      });
    });
  }


  /**
   * Helper function to insert. 
   * Creates a user object with the correct schema.
   * @param  {Object}
   * @return {Object}
   */
  function validateAndCreateUser(_user) {
    let user;
    if (!_user && !_user.username) {
      return Promise.reject(new Error('invalid user object')); // TODO: replace with validation error
    }

    return find(_user.username) // Ensure username is unique
    .then(function(exists) {
      return !exists ? validateNewUserProperties(_.omit(_user, ['username'])) :
        Promise.reject(new Error('username already exists')); // TODO: replace with validation error
    })
    .then(function(newUser) {
      let baseUserProps = { isActive: 'true', username: _user.username, id: uuid.v4() };
      if (newUser) {
        user = Object.assign(newUser, baseUserProps);
      } else user = baseUserProps;

      utils.appendCreatedAt(user);
      utils.appendUpdatedAt(user);

      return user;
    });
  }

  function validateUpdateToUserProperties(userProperties) {
    let updatedUserProperties = {};

    if (!Object.keys(userProperties).every(key => typeof key === 'string' && userPropsDefinitions[key])) {
      return Promise.reject(new Error('one or more properties is invalid')); // TODO: replace with validation error
    }

    for (let prop in userProperties) {
      if (userPropsDefinitions[prop].isMutable !== false) {
        updatedUserProperties[prop] = userProperties[prop];
      } else return Promise.reject(new Error('one or more properties is immutable')); // TODO: replace with validation error
    }

    return Object.keys(updatedUserProperties).length > 0 ? Promise.resolve(updatedUserProperties) : Promise.resolve(false);
  }

  function validateNewUserProperties(userProperties) {
    let newUserProperties = {};

    if (!Object.keys(userProperties).every(key => (typeof key === 'string' && !!userPropsDefinitions[key]))) {
      return Promise.reject(new Error('one or more property is invalid')); // TODO: replace with validation error
    }

    for (let prop in userPropsDefinitions) {
      let descriptor = userPropsDefinitions[prop];
      if (!userProperties[prop]) {
        if (descriptor.isRequired) {
          return Promise.reject(new Error(`${prop} is required`)); // TODO: replace with validation error
        }
        if (descriptor.defaultValue) {
          newUserProperties[prop] = descriptor.defaultValue;
        }
      } else newUserProperties[prop] = userProperties[prop];
    }

    return Object.keys(newUserProperties).length > 0 ? Promise.resolve(newUserProperties) : Promise.resolve(null);
  }

  return {
    insert,
    get,
    find,
    update,
    activate,
    deactivate,
    remove
  };
}
