/*
This migration will use the services to deactivate all credentials that are still active and coupled to the username
instead of the consumer ID. For each deactived credential, an identical new one will be issued and linked to the user
id, making sure the clients will continue to work correctly, as the Admin API's been already modified to change the
way it looks up the data.
*/

module.exports.up = function () {
  const log = require('migrate/lib/log');

  const userService = require('../lib/services/consumers/user.service');
  const credentialService = require('../lib/services/credentials/credential.service');
  const credentialDao = require('../lib/services/credentials/credential.dao');

  return new Promise((resolve, reject) => {
    userService.findAll() // Grab all the users
      .then(({ users }) => {
        const userPromises = users.map((user) => {
          log('Processing user', user.username);

          return credentialService.getCredentials(user.username) // Grab credentials coupled to the user name
            .then((credentials) => {
              const credentialPromises = credentials.filter(c => c.isActive).map((credential) => { // Filter the ones that are still active
                const credentialType = credential.type;
                log('Processing credential', `${credential.type}, user: ${user.username}`);

                return credentialService
                  .deactivateCredential(user.username, credentialType) // Deactivate the credential
                  .then(() => log('Processed credential', `${user.username} credential deactivated successfully.`))
                  .then(() => {
                    credential.isActive = 'true';
                    delete credential.type;
                  })
                  .then(() => credentialDao.insertCredential(user.id, credentialType, credential)
                    .catch(err => log.error('Credential existing already', err)) // Create a new one with the ID instead of the username
                  )
                  .then(() => log('Created credential', `${user.username} credential migrated successfully to ${user.id}`));
              });

              return Promise.all(credentialPromises);
            });
        });

        return Promise.all(userPromises); // Everything is awesome!
      }).then(() => resolve()).catch(reject);
  });
};

module.exports.down = function (next) {
  throw new Error('We\'re sorry — we can\'t make this happen');
};
