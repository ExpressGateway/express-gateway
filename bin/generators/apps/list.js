const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'list [options]',
      description: 'list apps',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} list [options]`)
          .example(`$0 ${process.argv[2]} list`)
          .string('p')
          .boolean(['q'])
          .describe('q', 'Only show IDs of apps')
          .alias('q', 'quiet')
          .group(['q', 'no-color', 'h'], 'Options:')
    });
  }

  initializing () {
  }

  prompting () {
    if (!this.argv.stdin) {
      return this._listFromCommandLine();
    }
  }
  _listFromCommandLine () {
    return this._list()
      .then(apps => {
        if (this.argv.q) {
          this.log(apps.map(u => u.id));
        } else {
          this.log(apps);
        }
        this.eg.exit();
      })
      .catch(err => {
        this.log.error(err.message);
        this.eg.exit();
      });
  }
  _list (options) {
    options = options || {};
    return this.sdk.users.list();
  }
};
