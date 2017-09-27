const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'list [options]',
      description: 'List applications',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} list [options]`)
          .example(`$0 ${process.argv[2]} list`)
          .string(['n', 'u'])
          .describe('n', 'Application name')
          .describe('u', 'Application User ID')
          .alias('n', 'name')
          .alias('u', 'userId')
          .group(['n', 'u'], 'Options:')
    });
  }

  prompting () {
    const {name, userId} = this.argv;
    return this.admin.apps.list(name, userId)
      .then(data => {
        let apps = data.apps;
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
