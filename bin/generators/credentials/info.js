const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'info <id|keyid> [options]',
      desc: 'Show details for a single credential',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} info <id|keyid> [options]`)
          .string(['t'])
          .alias('t', 'type')
          .demandOption(['t'])
          .nargs('t', 1)
          .describe('t', 'Type of credential: can be one of: oauth2, basic-auth, key-auth')
          .positional('id', { type: 'string' })

    });
  }

  prompting () {
    const argv = this.argv;

    return this.admin.credentials.info(argv.id, argv.type)
      .then(cred => {
        if (cred) {
          if (!argv.q) {
            this.stdout(JSON.stringify(cred, null, 2));
          } else {
            this.stdout(cred.id);
          }
        }
      })
      .catch(err => {
        this.log.error(err.message);
      });
  }
};
