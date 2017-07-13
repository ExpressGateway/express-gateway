const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['tokens <command> [options]', 'token'],
      desc: 'Manage tokens',
      builder: yargs => yargs
        .reset()
        .usage('Usage: $0 ' + process.argv[2] + ' <command> [options]')
        .command(this.createSubCommand('revoke'))
        .demandCommand()
    });
  }
};
