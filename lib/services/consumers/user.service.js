'use strict';

const userDao = require('./user.dao.js');
const applicationService = require('./application.service.js');
const credentialService = require('../credentials/credential.service.js');
const config = require('../../config');
const utils = require('../utils');
const uuidv4 = require('uuid/v4');

const s = {};

s.insert = function (user) {
  return validateAndCreateUser(user)
  .then(function (newUser) {
    return userDao.insert(newUser)
    .then(function (success) {
      if (success) {
        newUser.isActive = newUser.isActive === 'true';
        return newUser;
      } else return Promise.reject(new Error('insert user failed')); // TODO: replace with server error
    });
  });
};

s.get = function (userId, options) {
  if (!userId || !typeof userId === 'string') {
    return false;
  }

  return userDao
  .getUserById(userId)
  .then(function (user) {
    if (!user) {
      return false;
    }

    user.isActive = user.isActive === 'true';
    if (!options || !options.includePassword) {
      delete user.password;
    }
    return user;
  });
};

s.findAll = function (query) {
  return userDao.findAll(query || {}).then(data => {
    data.users = data.users || [];
    data.users.forEach(u => { u.isActive = u.isActive === 'true'; });
    return data;
  });
};

s.find = function (username, options) {
  if (!username || !typeof username === 'string') {
    return Promise.reject(new Error('invalid username')); // TODO: replace with validation error
  }

  return userDao
  .find(username)
  .then(userId => {
    return userId ? this.get(userId, options) : false;
  });
};

s.update = function (userId, _props) {
  if (!_props || !userId) {
    return Promise.reject(new Error('invalid user id')); // TODO: replace with validation error
  }
  return this.get(userId) // validate user exists
  .then(user => {
    if (!user) { return false; } // user does not exist

    delete _props.username;
    return validateUpdateToUserProperties(_props)
    .then(function (updatedUserProperties) {
      if (updatedUserProperties) {
        utils.appendUpdatedAt(updatedUserProperties);
        return userDao.update(userId, updatedUserProperties);
      } else return true; // there are no properties to update
    })
    .then(updated => {
      return updated ? true : Promise.reject(new Error('user update failed')); // TODO: replace with server error
    });
  });
};

s.deactivate = function (id) {
  return this.get(id) // make sure user exists
  .then(function () {
    return userDao.deactivate(id)
    .then(() => applicationService.deactivateAll(id)); // Cascade deactivate all applications associated with the user
  })
  .then(() => true)
  .catch(() => Promise.reject(new Error('failed to deactivate user')));
};

s.activate = function (id) {
  return this.get(id) // make sure user exists
  .then(function () {
    return userDao.activate(id);
  })
  .then(() => true)
  .catch(() => Promise.reject(new Error('failed to deactivate user')));
};

s.remove = function (userId) {
  return this.get(userId) // validate user exists
  .then(function (user) {
    return !user ? false // user does not exist
    : userDao.remove(userId)
    .then(function (userDeleted) {
      if (!userDeleted) {
        return Promise.reject(new Error('user delete failed')); // TODO: replace with server error
      } else {
        return Promise.all([ applicationService.removeAll(userId), // Cascade delete all apps associated with user
          credentialService.removeAllCredentials(user.username)]) // Cascade delete all user credentials
        .catch(() => Promise.reject(new Error('failed to delete user\'s applications or credentials'))) // TODO: replace with server error
        .then(() => true);
      }
    });
  });
};

function validateAndCreateUser (_user) {
  let user;
  const username = _user.username;
  if (!_user && !username) {
    return Promise.reject(new Error('invalid user object')); // TODO: replace with validation error
  }

  return s.find(username) // Ensure username is unique
  .then(function (exists) {
    if (exists) {
      throw new Error('username already exists');
    }
    return validateNewUserProperties(_user);
  })
  .then(function (newUser) {
    const baseUserProps = { isActive: 'true', username, id: uuidv4() };
    if (newUser) {
      user = Object.assign(newUser, baseUserProps);
    } else user = baseUserProps;

    utils.appendCreatedAt(user);
    utils.appendUpdatedAt(user);

    return user;
  });
}

function validateUpdateToUserProperties (userProperties) {
  const updatedUserProperties = {};

  if (!Object.keys(userProperties).every(key => typeof key === 'string' && config.models.users.properties[key])) {
    return Promise.reject(new Error('one or more properties is invalid')); // TODO: replace with validation error
  }

  for (const prop in userProperties) {
    if (config.models.users.properties[prop].isMutable !== false) {
      updatedUserProperties[prop] = userProperties[prop];
    } else return Promise.reject(new Error('one or more properties is immutable')); // TODO: replace with validation error
  }

  return Object.keys(updatedUserProperties).length > 0 ? Promise.resolve(updatedUserProperties) : Promise.resolve(false);
}

function validateNewUserProperties (userProperties) {
  const newUserProperties = {};

  if (!Object.keys(userProperties).filter(key => key !== 'username').every(key => !!config.models.users.properties[key])) {
    return Promise.reject(new Error('one or more property is invalid')); // TODO: replace with validation error
  }

  for (const prop in config.models.users.properties) {
    if (prop === 'username') {
      continue;
    }

    const descriptor = config.models.users.properties[prop];
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

module.exports = s;
