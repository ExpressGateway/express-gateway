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
    return this.admin.apps.list()
      .then(data => {
        const apps = data.apps;
        if (!apps || !apps.length) {
          return this.stdout('You have no apps');
        }
        apps.forEach(app => {
          if (this.argv.q) {
            this.stdout(app.id);
          } else {
            this.stdout(JSON.stringify(app, null, 2));
          }
        });
      })
      .catch(err => {
        this.log.error(err.message);
      });
  }
};
