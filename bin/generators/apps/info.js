const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'info [options] <app_id>',
      desc: 'Show details for a single application',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} info [options] <app_id>`)
          .group(['h'], 'Options:')
    });
  }

  prompting () {
    const argv = this.options.env.argv;
    const appService = eg.services.application;

    return appService
      .get(argv.app_id)
      .then(app => {
        if (app) {
          this.log(JSON.stringify(app, null, 2));
        }

        eg.exit();
      })
      .catch(err => {
        this.log.error(err.message);
        eg.exit();
      });
  }
};
