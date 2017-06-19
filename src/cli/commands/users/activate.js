/* eslint-disable no-console */

const common = require('../../common');

module.exports = {
  command: 'activate [options] <user_id|user_name..>',
  desc: 'Activate a user',
  builder: yargs => common(
    yargs
      .usage(`Usage: $0 ${process.argv[2]} activate [options] <user_id|user_name..>`)
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

    const activateCount = userIds.length;
    let activationsCompleted = 0;

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
            return userService.activate(user.id)
              .then(() => {
                return userService.get(user.id);
              });
          }
        })
        .then(user => {
          activationsCompleted++;

          if (user) {
            if (!argv.q) {
              console.log(`Activated ${userId}`);
            } else {
              console.log(user.id);
            }
          }

          if (activationsCompleted === activateCount) {
            db.end(true);
          }
        })
        .catch(err => {
          activationsCompleted++;

          console.error(err.message);

          if (activationsCompleted === activateCount) {
            db.end(true);
          }
        });
    });
  }
};
