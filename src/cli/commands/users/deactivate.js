/* eslint-disable no-console */

const common = require('../../common');

module.exports = {
  command: 'deactivate [options] <user_id|user_name..>',
  desc: 'Deactivate a user',
  builder: yargs => common(
    yargs
      .usage(`Usage: $0 ${process.argv[2]} deactivate [options] <user_id|user_name..>`)
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

    const deactivateCount = userIds.length;
    let deactivationsCompleted = 0;

    userIds.forEach(userId => {
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
            return userService.deactivate(user.id)
              .then(() => {
                return userService.get(user.id);
              });
          }
        })
        .then(user => {
          deactivationsCompleted++;

          if (user) {
            if (!argv.q) {
              console.log(`Deactivated ${userId}`);
            } else {
              console.log(user.id);
            }
          }

          if (deactivationsCompleted === deactivateCount) {
            db.end(true);
          }
        })
        .catch(err => {
          deactivationsCompleted++;

          console.error(err.message);

          if (deactivationsCompleted === deactivateCount) {
            db.end(true);
          }
        });
    });
  }
};
