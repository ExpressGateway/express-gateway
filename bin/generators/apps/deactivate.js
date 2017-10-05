const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'deactivate [options] <app_id..>',
      desc: 'Deactivate an application',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} deactivate [options] <app_id..>`)
    });
  }

  prompting () {
    const argv = this.argv;

    const appIds = Array.isArray(argv.app_id)
      ? argv.app_id
      : [argv.app_id];

    return Promise.all(appIds.map((appId) => {
      return this.admin.apps.deactivate(appId)
        .then(res => {
          const status = res.status;

          if (status) {
            if (argv.q) {
              this.stdout(appId);
            } else {
              this.log.ok(`${status} ${appId}`);
            }
          }
        })
        .catch(err => {
          this.log.error(err.message);
        });
    }));
  }
};
