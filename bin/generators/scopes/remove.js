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
    const scopes = Array.isArray(this.argv.scope)
      ? this.argv.scope
      : [this.argv.scope];

    return Promise.all(scopes.map((scope) => {
      return this.admin.scopes.remove(scope)
        .then(res => {
          if (this.argv.q) {
            this.stdout(`${scope}`);
          } else {
            this.log.ok(`Removed ${scope}`);
          }
        })
        .catch(err => {
          this.log.error(err.message);
        });
    }));
  }
};
