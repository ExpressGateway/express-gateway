'use strict';

let getCredentialService = require('./credential.service.js');
let credentialService;

module.exports = function (config) {
  if (!config) {
    console.error('config not found');
    process.exit(1);
  }

  if (!credentialService) {
    credentialService = getCredentialService(config);
  }

  return credentialService;
};
