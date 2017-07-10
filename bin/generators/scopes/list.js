const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'list [options]',
      description: 'List scopes',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} list [options]`)
          .example(`$0 ${process.argv[2]} list`)
    });
  }

  prompting () {
    return this.admin.scopes.list()
      .then(res => {
        if (!res.scopes || !res.scopes.length) {
          return this.log('You have no scopes');
        }
        res.scopes.forEach(scope => this.log(scope));
        this.eg.exit();
      })
      .catch(err => {
        this.log.error(err.message);
        this.eg.exit();
      });
  }
};
