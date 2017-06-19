const common = require('../../common');

module.exports = {
  command: 'list [options]',
  desc: 'List applications',
  builder: yargs => common(
    yargs
      .usage('Usage: $0 apps list [options]')
      .boolean(['a', 'q'])
      .string('u')
      .describe('a', 'Show all apps (default shows just active)')
      .describe('u', 'Filter apps by user')
      .describe('q', 'Only display app IDs')
      .alias('a', 'all').nargs('f', 1)
      .alias('u', 'user-id').nargs('u', 1)
      .alias('q', 'quiet').nargs('l', 1)
  ).argv,
  handler: argv => {}
};
