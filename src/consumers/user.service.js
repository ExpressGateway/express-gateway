'use strict';

let getUserDao = require('./user.dao.js');
let getApplicationService = require('./application.service.js');
let _ = require('lodash');
let Promise = require('bluebird');
let utils = require('../utils');
let uuid = require('node-uuid');
let userDao, applicationService;

module.exports = function(config) {
  const userPropsDefinitions = config.users.properties;

  userDao = getUserDao(config);
  applicationService = getApplicationService(config);

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
        } else return Promise.reject(new Error('insert user failed'));
      });
    });
  }

  function exists(username) {
    return userDao.usernameExists(username);
  }

  function authenticate(username, password) {
    if (!username || !password) {
      return Promise.reject(new Error('invalid user'));
    }

    return userDao.authenticate(username, password)
    .then(function(id) {
      return id ? { id: id } : null;
    });
  }

  function get(userId) {
    if (!userId || !typeof userId === 'string') {
      return Promise.reject(new Error('invalid user id'));
    }

    return userDao
    .getUserById(userId)
    .then(function(user) {
      return user ? _.omit(user, ['password']) : Promise.reject(new Error('user not found'));
    });
  }

  function findUserByUsername(username) {
    if (!username || !typeof username === 'string') {
      return Promise.reject(new Error('invalid username'));
    }

    return userDao
    .getUserIdByUsername(username)
    .then(function(userId) {
      return userId ? get(userId) : Promise.reject(new Error('username not found'));
    });
  }

  function findUserByEmail(email) {
    if (!email || !typeof email === 'string') {
      return Promise.reject(new Error('invalid email'));
    }

    return userDao
    .getUserIdByEmail(email)
    .then(function(userId) {
      return userId ? get(userId) : Promise.reject(new Error('email not found'));
    });
  }

  function update(userId, _props) {
    let props;
    if (!_props || !userId) {
      return Promise.reject(new Error('invalid user id'));
    }

    return get(userId) // validate user exists
    .then(function() {
      return validateUpdateToUserProperties(_.omit(_props, ['username']));
    })
    .then(function(){
      props = _.cloneDeep(_props);
      utils.appendUpdatedAt(props);
      return userDao.update(userId, props);
    })
    .then(function(updated) {
      return updated ? true : Promise.reject(new Error('user update failed'))
    });
  }

  function remove(userId) {
    return get(userId) // validate user exists
    .then(function() {
      return userDao.remove(userId)
    })
    .then(function(userDeleted) {
      if (!userDeleted) {
        return Promise.reject(new Error('failed to delete user'));
      }
      // Cascade delete all apps associated with user
      return applicationService.removeAll(userId);
    })
    .then(function(appsDeleted) {
      return appsDeleted ? true : Promise.reject(new Error('failed to delete user\'s applications'));
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
      return Promise.reject(new Error('invalid user object'));
    }

    return exists(_user.username) // Ensure username is unique
    .then(function(exists) {
      return !exists ? validateNewUserProperties(_.omit(_user, ['username'])) : Promise.reject(new Error('username already exists'));
    })
    .then(function(newUser) {
      let baseUserProps = { username: _user.username, id: uuid.v4() };
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
      return Promise.reject(new Error('one or more properties is invalid'));
    }

    for (let prop in userProperties) {
      if (userPropsDefinitions[prop].isMutable !== false) {
        updatedUserProperties = userProperties[prop];
      } else return Promise.reject(new Error('invalid property ' + prop));
    }

    return Object.keys(updatedUserProperties).length > 0 ? Promise.resolve(updatedUserProperties) : Promise.resolve(null);
  }

  function validateNewUserProperties(userProperties) {
    let newUserProperties = {};

    if (!Object.keys(userProperties).every(key => (typeof key === 'string' && !!userPropsDefinitions[key]))) {
      return Promise.reject(new Error('one or more property is invalid'));
    }

    for (let prop in userPropsDefinitions) {
      let descriptor = userPropsDefinitions[prop];
      if (!userProperties[prop]) {
        if (descriptor.isRequired) {
          return Promise.reject(new Error(`${prop} is required`));
        }
        if (descriptor.defaultValue) {
          newUserProperties[prop] = descriptor.defaultValue;
        }
      } else newUserProperties[prop] = userProperties[prop];
    }

    return Object.keys(newUserProperties).length > 0 ? Promise.resolve(newUserProperties) : Promise.resolve(null);
  }

  return {
    insert: insert,
    authenticate: authenticate,
    get: get,
    findUserByUsername: findUserByUsername,
    findUserByEmail: findUserByEmail,
    exists: exists,
    update: update,
    remove: remove
  };
}
