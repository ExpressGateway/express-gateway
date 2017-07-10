const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['remove [options] <app_id..>', 'rm'],
      desc: 'Remove an application',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} remove [options] <app_id..>`)
    });
  }

  prompting () {
    const argv = this.argv;

    const appIds = Array.isArray(argv.app_id)
      ? argv.app_id
      : [argv.app_id];

    return Promise.all(appIds.map((appId) => {
      return this.admin.apps.remove(appId)
          .then(app => {
            if (app) {
              if (!argv.q) {
                this.log.ok(`Removed ${appId}`);
              } else {
                this.log(appId);
              }
            }
          })
          .catch(err => {
            this.log.error(err.message);
          });
    })).then(() => this.eg.exit());
  }
};
