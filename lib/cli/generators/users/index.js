const EgGenerator = require('../../eg_generator.js');

module.exports = class extends EgGenerator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['users <command> [options]', 'user'],
      desc: 'Manage users',
      builder: yargs => yargs
        .reset()
        .usage('Usage: $0 ' + process.argv[2] + ' <command> [options]')
        .command(this.createSubCommand('create'))
        .command(this.createSubCommand('info'))
        .command(this.createSubCommand('remove'))
        .command(this.createSubCommand('activate'))
        .command(this.createSubCommand('deactivate'))
        .command(this.createSubCommand('update'))
        .demandCommand()
    });
  }
};
