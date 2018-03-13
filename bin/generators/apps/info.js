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
          .positional('app_id', { type: 'string' })
    });
  }

  prompting () {
    return this.admin.apps.info(this.argv.app_id)
      .then(app => {
        if (app) {
          this.stdout(JSON.stringify(app, null, 2));
        }
      })
      .catch(err => {
        this.log.error(err.message);
      });
  }
};
