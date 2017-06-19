const yargs = require('yargs');

const program = yargs
  .usage('Usage: $0 <command> [options]')
  .commandDir('./commands')
  .demandCommand()
  .recommendCommands()
  .strict()
  .alias('h', 'help')
  .help()
  .version()
  .global('version', false)
  .wrap(Math.min(90, yargs.terminalWidth()));

program.argv; // eslint-disable-line no-unused-expressions
