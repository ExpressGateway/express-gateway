const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'list [options]',
      description: 'List apps',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} list [options]`)
          .example(`$0 ${process.argv[2]} list`)
    });
  }

  prompting () {
    return this.admin.users.list()
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
};
