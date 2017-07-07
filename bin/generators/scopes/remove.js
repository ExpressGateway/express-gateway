const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['remove [options] <scope..>', 'rm'],
      desc: 'Remove a scope',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} remove [options] <scope..>`)
          .group(['h'], 'Options:')
    });
  }

  prompting () {
    const argv = this.argv;

    const scopes = Array.isArray(argv.scope)
      ? argv.scope
      : [argv.scope];

    return Promise.all(scopes.map((scope) => {
      return this.sdk.scopes.remove(argv.scope)
        .then(res => {
          this.log.ok(`Removed scope ${scope}`);
        })
        .catch(err => {
          this.log.error(err.message);
        });
    }));
  }
};
