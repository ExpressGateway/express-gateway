const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['credentials <command> [options]', 'credential'],
      desc: 'Manage credentials',
      builder: yargs => yargs
        .reset()
        .usage('Usage: $0 ' + process.argv[2] + ' <command> [options]')
        .command(this.createSubCommand('create'))
        .command(this.createSubCommand('activate'))
        .command(this.createSubCommand('deactivate'))
        .command(this.createSubCommand('info'))
        .command(this.createSubCommand('list'))
        .demandCommand()
    });
  }
};
