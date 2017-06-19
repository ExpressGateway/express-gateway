/* eslint-disable no-console */

const common = require('../../common');

module.exports = {
  command: 'info <user_id> [options]',
  desc: 'Show details for a single user',
  builder: yargs => common(
    yargs
      .usage(`Usage: $0 ${process.argv[2]} info <user_id|user_name> [options]`)
      .describe('q', 'Only show user ID')
      .alias('q', 'quiet')
      .group(['q', 'h'], 'Options:')
  ).argv,
  handler: argv => {
    // TODO: Pull this from config-loader
    const config = require('../../../config/config.model');
    const db = require('../../../db').getDb();
    const userService = require('../../../consumers')(config).userService;

    userService
      .find(argv.user_id)
      .then(user => {
        if (!user) {
          return userService.get(argv.user_id);
        }

        return user;
      })
      .then(user => {
        if (user) {
          if (!argv.q) {
            console.log(JSON.stringify(user, null, 2));
          } else {
            console.log(user.id);
          }
        }

        db.end(true);
      })
      .catch(err => {
        console.error(err.message);
        db.end(true);
      });
  }
};
