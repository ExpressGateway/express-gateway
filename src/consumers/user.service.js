'use strict';

let getUserDao = require('./user.dao.js');
let getApplicationService = require('./application.service.js');
let _ = require('lodash');
let Promise = require('bluebird');
let utils = require('./utils');
let userService, userDao, applicationService;

module.exports = function(config) {
  if (userService) {
    return userService;
  }

  const userPropsDefinitions = {
    username:   { type: 'string', isMutable: true },
    password:   { type: 'string', isMutable: true },
    email:      { type: 'string', isMutable: true },
    firstname:  { type: 'string', isMutable: true },
    lastname:   { type: 'string', isMutable: true }
  };

  userDao = getUserDao(config);
  applicationService = getApplicationService(config);

  function insert(user) {
    return validateAndCreateUser(user)
    .then(function(newUser) {
      return userDao.insert(newUser)
      .then(function(id) {
        return {
          username: newUser.username,
          id: id,
          createdAt: newUser.createdAt
        }
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
      return validateUserProperties(_props);
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

    user = _.cloneDeep(_user);
    return exists(user.username) // Ensure username is unique
    .then(function(exists) {
      return !exists ? validateUserProperties(user, 'create') : Promise.reject(new Error('username already exists'));
    })
    .then(function() {
      utils.appendCreatedAt(user);
      utils.appendUpdatedAt(user);

      return user;
    });
  }

  function validateUserProperties(user, operationType) {
    for (let key in user) {
        if (!(userPropsDefinitions.hasOwnProperty(key) &&
              userPropsDefinitions[key].isMutable &&
              typeof user[key] === userPropsDefinitions[key]['type'])) {
          return Promise.reject(new Error('invalid user property ' + key));
        }
    }

    // Ensure new user doesn't have properties outside of the user schema
    if (operationType === 'create' && Object.keys(user).length !== Object.keys(userPropsDefinitions).length) {
      return Promise.reject(new Error('invalid user object'));
    }
    return Promise.resolve(true);
  }


  userService = {
    insert: insert,
    authenticate: authenticate,
    get: get,
    findUserByUsername: findUserByUsername,
    findUserByEmail: findUserByEmail,
    exists: exists,
    update: update,
    remove: remove
  };

  return userService;
}
