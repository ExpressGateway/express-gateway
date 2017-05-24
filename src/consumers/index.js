'use strict';

let getUserService = require('./user.service.js');
let getApplicationService = require('./application.service.js');
let userService, applicationService;

module.exports = function(config) {
  if (!config) {
    console.error('config not found');
    process.exit(1);
  }

  if (!userService) {
    userService = getUserService(config);
  }

  if (!applicationService) {
    applicationService = getApplicationService(config);
  }

  return {
    userService,
    applicationService
  }
}