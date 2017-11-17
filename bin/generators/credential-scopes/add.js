const eg = require('../../eg');
const chalk = require('chalk');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'add [options] <scopes..>',
      desc: 'Add scopes to a credential by id or keyid',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} add [options] <scopes..>`)
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
    let p = Promise.resolve();
    argv.scopes.forEach(scope => {
      // executing in sequence to avoid race
      p = p.then(() => {
        return this.admin.credentials.addScope(argv.id, argv.t, scope)
          .then(res => {
            if (!argv.q) {
              this.log.ok(`Scope ${scope} added to ${argv.id}`);
            }
            return res;
          })
          .catch(err => {
            this.log.error(chalk.red('Error adding scope ') + chalk.yellow(scope) + ' : ' + ((err.response && err.response.error && err.response.error.text) || err.message));
          });
      });
    });
    p.catch(err => {
      this.log.error(err.message);
    });
    return p;
  }
};
