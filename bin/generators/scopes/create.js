const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'create [options] <scope..>',
      desc: 'Create a scope',
      builder: yargs =>
        yargs
        .usage(`Usage: $0 ${process.argv[2]} create [options] <scope..>`)
        .example(`$0 ${process.argv[2]} create scope_name`)
    });
  }

  prompting () {
    const argv = this.argv;
    const scopes = Array.isArray(argv.scope)
      ? argv.scope
      : [argv.scope];

    return Promise.all(scopes.map((scope) => {
      return this.sdk.scopes.create(argv.scope)
        .then(res => {
          this.log.ok(`Created scope ${scope}`);
        })
        .catch(err => {
          this.log.error(err.message);
        });
    }));
  };
};
