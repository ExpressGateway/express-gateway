'use strict';

let getUserService = require('./user.service.js');
let getApplicationService = require('./application.service.js');

module.exports = function(config) {
  config = config || {
    redis: {
      host: 'localhost',
      port: '6379'
    },
    users: {
      redis: {
        userHashPrefix: 'TEST-USER',
        usernameSetPrefix: 'TEST-USERNAME',
        emailSetPrefix: 'TEST-EMAIL'
      },
      usernameMaxLength: 15,
      usernameMinLength: 3,
    },
    bcrypt: {
      saltRounds: 10
    }
  }

  return {
    userService: getUserService(config),
    applicationService: getApplicationService(config)
  }
}