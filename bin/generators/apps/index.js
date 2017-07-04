const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['apps <command> [options]', 'app'],
      desc: 'Manage apps',
      builder: yargs => yargs
        .reset()
        .usage('Usage: $0 ' + process.argv[2] + ' <command> [options]')
        .command(this.createSubCommand('create'))
        .command(this.createSubCommand('info'))
        .command(this.createSubCommand('remove'))
        .command(this.createSubCommand('activate'))
        .command(this.createSubCommand('deactivate'))
        .command(this.createSubCommand('update'))
        .command(this.createSubCommand('list'))
        .demandCommand()
    });
  }
};
