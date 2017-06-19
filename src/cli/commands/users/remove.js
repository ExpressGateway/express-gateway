/* eslint-disable no-console */

const common = require('../../common');

module.exports = {
  command: ['remove  [options] <user_id|user_name..>', 'rm'],
  desc: 'Remove a user',
  builder: yargs => common(
    yargs
      .usage(`Usage: $0 ${process.argv[2]} remove [options] <user_id|user_name..>`)
      .boolean('q')
      .describe('q', 'Only show user ID')
      .alias('q', 'quiet')
      .group(['q', 'h'], 'Options:')
  ).argv,
  handler: argv => {
    // TODO: Pull this from config-loader
    const config = require('../../../config/config.model');
    const db = require('../../../db').getDb();
    const userService = require('../../../consumers')(config).userService;

    const userIds = Array.isArray(argv.user_id)
      ? argv.user_id
      : [argv.user_id];

    const removalCount = userIds.length;
    let removalsCompleted = 0;

    userIds.forEach(function (userId) {
      userService
        .find(userId)
        .then(user => {
          if (!user) {
            return userService.get(userId);
          }

          return user;
        })
        .then(user => {
          if (user) {
            // TODO: Remove user's apps
            return userService.remove(user.id).then(() => user);
          }
        })
        .then(user => {
          removalsCompleted++;

          if (user) {
            console.log(argv.q ? user.id : `Removed ${userId}`);
          }

          if (removalsCompleted === removalCount) {
            db.end(true);
          }
        })
        .catch(err => {
          removalsCompleted++;

          console.error(err.message);

          if (removalsCompleted === removalCount) {
            db.end(true);
          }
        });
    });
  }
};
