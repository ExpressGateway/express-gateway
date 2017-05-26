'use strict';

let getCredentialService = require('./credentials/credential.service.js');
let getUserService = require('./consumers/application.service.js');
let getApplicationService = require('./consumers/user.service.js');
let _ = require('lodash');
let Promise = require('bluebird');
let bcrypt = require('bcrypt');
let credentials, users, applications;

module.exports = function(config) {
  credentials = getCredentialService(config);
  users = getUserService(config);
  applications = getApplicationService(config);

  return function authenticate(id, password, type) {
    let consumer = {};

    return applications.get(id)
    .then(app => {
      if (app) {
        consumer.type = 'application';
        consumer.id = id;
        consumer.application = app;
        consumer.userId = app.userId;
        consumer.isActive = app.isActive;
        return;
      } else return users.find(id)
        .then(user => {
          if (user) {
            consumer.type = 'user';
            consumer.id = user.id;
            consumer.username = id;
            consumer.user = user;
            consumer.isActive = user.isActive;
          }
          return;
        });
    })
    .then(() => {
      if (!consumer.type || !consumer.isActive) {
        return false;
      } else return getCredential(id, type, { includePassword: true })
        .then(_credential => {
          return _credential ? compareSaltAndHashed(password, credential[config.credentials[type]['passwordKey']]) : false;
        });
    });
  }
}

function compareSaltAndHashed(password, hash) {
  if (!password || !hash) {
    return null;
  }
  return bcrypt.compareAsync(password, hash);
}