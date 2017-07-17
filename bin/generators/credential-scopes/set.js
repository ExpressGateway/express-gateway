const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'set [options] <scopes..>',
      desc: 'Replaces scopes for a credential by id or keyid',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} set [options] <scopes..>`)
          .string(['t', 'id'])
          .alias('t', 'type')
          .demandOption(['t', 'id'])
          .nargs('t', 1)
          .describe('t', 'Type of credential: can be one of: oauth2, basic-auth, key-auth')
          .alias('id', 'keyid')
          .describe('id', 'Id or keyId of credential to add scopes to')
    });
  }

  prompting () {
    const argv = this.argv;
    return this.admin.credentials.setScopes(argv.id, argv.t, argv.scopes)
      .then(res => {
        if (!argv.q) {
          this.log.ok(`Scopes ${argv.scopes} set for ${argv.id}`);
        }
      })
      .catch(err => {
        this.log.error(err.message);
      });
  }
};
