module.exports = {
  command: ['users <command> [options]', 'user'],
  desc: 'Manage users',
  builder: yargs => yargs
    .reset()
    .usage('Usage: $0 ' + process.argv[2] + ' <command> [options]')
    .commandDir('users')
    .demandCommand(),
  handler: yargs => {}
};
