/* eslint-disable no-console */

const common = require('../../common');

module.exports = {
  command: ['remove [options] <app_id..>', 'rm'],
  desc: 'Remove an application',
  builder: yargs => common(
    yargs
      .usage(`Usage: $0 ${process.argv[2]} remove [options] <app_id..>`)
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

    const removalCount = appIds.length;
    let removalsCompleted = 0;

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
            console.log(argv.q ? app.id : `Removed ${appId}`);
          }

          if (removalsCompleted === removalCount) {
            db.end(true);
          }
        })
        .catch(err => {
          removalsCompleted++;

          console.error(err.message);

          if (removalsCompleted === removalCount) {
            db.end(true);
          }
        });
    });
  }
};
