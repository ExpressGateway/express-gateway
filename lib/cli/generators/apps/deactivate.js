const common = require('../../common');
const EgGenerator = require('../../eg_generator');
const util = require('../../util');

module.exports = class extends EgGenerator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'deactivate [options] <app_id..>',
      desc: 'Deactivate an application',
      builder: yargs => common(
        yargs
          .usage(`Usage: $0 ${process.argv[2]} deactivate [options] <app_id..>`)
          .boolean('q')
          .describe('q', 'Only show app ID')
          .alias('q', 'quiet')
          .group(['q', 'h'], 'Options:'))
    });
  }

  prompting () {
    return this._deactivate();
  }

  _deactivate () {
    const argv = this.env.argv;
    const appService = require('../../../services').application;

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
              util.exit();
              resolve(); // don't propagate errors
            }
          })
          .catch(err => {
            deactivationsCompleted++;

            self.log.error(err.message);

            if (deactivationsCompleted === deactivateCount) {
              util.exit();
              resolve(); // don't propagate errors
            }
          });
      });
    });
  }
};
