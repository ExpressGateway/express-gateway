const common = require('../../common');
const EgGenerator = require('../../eg_generator');
const util = require('../../util');

module.exports = class extends EgGenerator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['remove [options] <app_id..>', 'rm'],
      desc: 'Remove an application',
      builder: yargs => common(
        yargs
          .usage(`Usage: $0 ${process.argv[2]} remove [options] <app_id..>`)
          .boolean('q')
          .describe('q', 'Only show app ID')
          .alias('q', 'quiet')
          .group(['q', 'h'], 'Options:'))
    });
  }

  prompting () {
    const argv = this.options.env.argv;
    const appService = require('../../../services').application;

    const appIds = Array.isArray(argv.app_id)
      ? argv.app_id
      : [argv.app_id];

    return new Promise((resolve, reject) => {
      const removalCount = appIds.length;
      let removalsCompleted = 0;

      let self = this;
      let errors = [];
      appIds.forEach(function (appId) {
        appService
          .get(appId)
          .then(app => {
            if (app) {
              return appService.remove(app.id).then(() => app);
            }
          })
          .then(app => {
            removalsCompleted++;

            if (app) {
              if (!argv.q) {
                self.log.ok(`Removed ${appId}`);
              } else {
                self.log(app.id);
              }
            }

            if (removalsCompleted === removalCount) {
              util.exit();
              if (errors.length === 0) {
                resolve();
              } else {
                reject(errors);
              }
            }
          })
          .catch(err => {
            removalsCompleted++;

            self.log.error(err.message);
            errors.push(err);

            if (removalsCompleted === removalCount) {
              util.exit();
              reject(errors);
            }
          });
      });
    });
  }
};
