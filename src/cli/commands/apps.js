module.exports = {
  command: ['apps <command> [options]', 'app'],
  desc: 'Manage apps',
  builder: yargs => yargs
    .usage('Usage: $0 ' + process.argv[2] + ' <command> [options]')
    .commandDir('apps')
    .demandCommand(),
  handler: yargs => {}
};
