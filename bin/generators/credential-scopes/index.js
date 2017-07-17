const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['credential:scopes <command> [options]', 'credential:scope'],
      desc: 'Manage scopes for credentials',
      builder: yargs => yargs
        .reset()
        .usage('Usage: $0 ' + process.argv[2] + ' <command> [options]')
        .command(this.createSubCommand('add'))
        .command(this.createSubCommand('remove'))
        .command(this.createSubCommand('set'))
        .demandCommand()
    });
  }
};
