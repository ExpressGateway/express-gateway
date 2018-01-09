/*
This migration index all the applications by adding the relative key in the current Redis instance.
*/

module.exports.up = function () {
  const log = require('migrate/lib/log');
  const db = require('../lib/db');
  const config = require('../lib/config');
  const userService = require('../lib/services/consumers/user.service');
  const applicationDao = require('../lib/services/consumers/application.dao');

  return new Promise((resolve, reject) => {
    userService.findAll() // Grab all the users
      .then(({ users }) => {
        const userPromises = users.map((user) => {
          log('Processing user', user.username);

          return applicationDao.getAll(user.id) // Grab the applications coupled to the user name
            .then((applications) => {
              const applicationPromises = applications.map((app) => {
                const appNamespace = 'application';
                const appNameSetKey = config.systemConfig.db.redis.namespace.concat('-', appNamespace).concat(':', app.name);
                log('Indexing', `${app.id} as ${app.name}`);
                return db.sadd(appNameSetKey, app.id).catch((err) => log.error('Key existing', err)); // Try to add the missing index
              });
              return Promise.all(applicationPromises);
            });
        });

        return Promise.all(userPromises);
      }).then(() => resolve()).catch(reject);
  });
};

module.exports.down = function (next) {
  throw new Error('We\'re sorry — we can\'t make this happen');
};
