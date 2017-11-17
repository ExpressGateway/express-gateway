const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'remove [options] <scopes..>',
      desc: 'Remove scopes from a credential by id or keyid',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} remove [options] <scopes..>`)
          .string(['t', 'id'])
          .alias('t', 'type')
          .demandOption(['t', 'id'])
          .nargs('t', 1)
          .describe('t', 'Type of credential: can be one of: oauth2, basic-auth, key-auth')
          .alias('id', 'keyid')
          .describe('id', 'Id or keyId of credential to remove scopes from')
    });
  }

  prompting () {
    const argv = this.argv;
    let p = Promise.resolve();

    argv.scopes.forEach(scope => {
      // executing in sequence to avoid race
      p = p.then(() => {
        return this.admin.credentials.removeScope(argv.id, argv.t, scope)
          .then(res => {
            if (!argv.q) {
              this.log.ok(`Scope ${scope} removed from ${argv.id}`);
            }
            return res;
          });
      });
    });
    p.catch(err => {
      this.log.error(err.message);
    });
    return p;
  }
};
