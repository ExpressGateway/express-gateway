const common = require('../../common');

module.exports = {
  command: ['list [options]', 'ls'],
  desc: 'List users',
  builder: yargs => common(
    yargs
      .usage('Usage: $0 users list [options]')
      .boolean(['a', 'q'])
      .describe('a', 'Show all users (default shows just active)')
      .describe('q', 'Only display user IDs')
      .alias('a', 'all').nargs('f', 1)
      .alias('q', 'quiet')
  ).argv,
  handler: argv => {
    // TODO: Pull this from config-loader
    // const config = require('../../../src/config/config.model');
    // const db = require('../../../src/db').getDb();
    // const userService = require('../../../src/consumers')(config).userService;

    // TODO: Implement userService#list
    // db.end(true);
  }
};
