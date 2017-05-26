// 'use strict';

// let getCredentialService = require('./credentials/credential.service.js');
// let getUserService = require('./consumers/application.service.js');
// let getApplicationService = require('./consumers/user.service.js');
// let _ = require('lodash');
// let Promise = require('bluebird');
// let bcrypt = require('bcrypt');
// let credentials, users, applications;

// module.exports = function(config) {
//   credentials = getCredentialService(config);
//   users = getUserService(config);
//   applications = getApplicationService(config);

//   return function authenticate(id, password, type) {
//     let consumer = {};

//     return applications.get(id)
//     .catch(() => { // credential does not belong to a user
//       return users.getUserByUsername(id)
//       .catch(() => { // credential does not belong to an application
//         return false;
//       })
//       .then(() => {

//       })
//     })
//     .then(() => {

//     })

    

//     return getCredential(id, type, { includePassword: true })
//     .then(_credential => {
//       credential = _credential;
//       return credential ? compareSaltAndHashed(password, credential[config.credentials[type]['passwordKey']]) : false;
//     })
//     .then(authenticated => {
//       return authenticated ? true : false;
//     });
//   }
// }

// function compareSaltAndHashed(password, hash) {
//   if (!password || !hash) {
//     return null;
//   }
//   return bcrypt.compareAsync(password, hash);
// }