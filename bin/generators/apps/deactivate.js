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
          .boolean('q')
          .describe('q', 'Only show app ID')
          .alias('q', 'quiet')
          .group(['q', 'h'], 'Options:')
    });
  }

  prompting () {
    return this._deactivate();
  }

  _deactivate () {
    const argv = this.argv;
    const appService = this.eg.services.application;

    const appIds = Array.isArray(argv.app_id)
      ? argv.app_id
      : [argv.app_id];

    const self = this;
    return new Promise(resolve => {
      const deactivateCount = appIds.length;
      let deactivationsCompleted = 0;

      appIds.forEach(function (appId) {
        appService
          .get(appId)
          .then(app => {
            if (app) {
              return appService.deactivate(app.id).then(() => app);
            }
          })
          .then(app => {
            deactivationsCompleted++;

            if (app) {
              if (!argv.q) {
                self.log.ok(`Deactivated ${appId}`);
              } else {
                self.log(app.id);
              }
            }

            if (deactivationsCompleted === deactivateCount) {
              self.eg.exit();
              resolve(); // don't propagate errors
            }
          })
          .catch(err => {
            deactivationsCompleted++;

            self.log.error(err.message);

            if (deactivationsCompleted === deactivateCount) {
              self.eg.exit();
              resolve(); // don't propagate errors
            }
          });
      });
    });
  }
};
