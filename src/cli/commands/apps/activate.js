/* eslint-disable no-console */

const common = require('../../common');

module.exports = {
  command: 'activate [options] <app_id..>',
  desc: 'Activate an application',
  builder: yargs => common(
    yargs
      .usage(`Usage: $0 ${process.argv[2]} activate [options] <app_id..>`)
      .boolean('q')
      .describe('q', 'Only show app ID')
      .alias('q', 'quiet')
      .group(['q', 'h'], 'Options:')
  ).argv,
  handler: argv => {
    // TODO: Pull this from config-loader
    const config = require('../../../config/config.model');
    const db = require('../../../db').getDb();
    const appService = require('../../../consumers')(config).applicationService;

    const appIds = Array.isArray(argv.app_id)
      ? argv.app_id
      : [argv.app_id];

    const activateCount = appIds.length;
    let activationsCompleted = 0;

    appIds.forEach(function (appId) {
      appService
        .get(appId)
        .then(app => {
          if (app) {
            return appService.activate(app.id).then(() => app);
          }
        })
        .then(app => {
          activationsCompleted++;

          if (app) {
            console.log(argv.q ? app.id : `Deactivated ${appId}`);
          }

          if (activationsCompleted === activateCount) {
            db.end(true);
          }
        })
        .catch(err => {
          activationsCompleted++;

          console.error(err.message);

          if (activationsCompleted === activateCount) {
            db.end(true);
          }
        });
    });
  }
};
