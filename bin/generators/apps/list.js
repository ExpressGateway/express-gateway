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
          .boolean('a').alias('a', 'all').describe('a', 'List all the apps instead of stopping to the fist page')
          .example(`$0 ${process.argv[2]} list`)
    });
  }

  prompting () {
    return this.admin.apps.list({ all: this.argv.a })
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
