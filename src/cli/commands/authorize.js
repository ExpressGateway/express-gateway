module.exports = {
  command: 'authorize [options]',
  desc: 'Manage users',
  builder: yargs => yargs
    .usage('Usage: $0 authorize [options]')
    .string(['i', 's', 'a', 'o', 'q'])
    .describe('i', 'Client ID')
    .describe('s', 'Client secret')
    .describe('a', 'API endpoint identifier')
    .describe('o', 'Scope for the access token')
    .describe('q', 'Only display the access token')
    .alias('i', 'client-id').nargs('i', 1)
    .alias('s', 'client-secret').nargs('s', 1)
    .alias('a', 'api').nargs('a', 1)
    .alias('o', 'scope').nargs('o', 1)
    .alias('q', 'quiet').nargs('q', 1)
    .demandOption(['i', 's', 'a']),
  handler: yargs => {}
};
