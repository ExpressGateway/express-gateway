/* eslint-disable no-console */

const common = require('../../common');

module.exports = {
  command: 'info [options] <app_id>',
  desc: 'Show details for a single application',
  builder: yargs => common(
    yargs
      .usage(`Usage: $0 ${process.argv[2]} info [options] <app_id>`)
      .group(['h'], 'Options:')
  ).argv,
  handler: argv => {
    // TODO: Pull this from config-loader
    const config = require('../../../config/config.model');
    const db = require('../../../db').getDb();
    const appService = require('../../../consumers')(config).applicationService;

    appService
      .get(argv.app_id)
      .then(app => {
        if (app) {
          console.log(JSON.stringify(app, null, 2));
        }

        db.end(true);
      })
      .catch(err => {
        console.error(err.message);
        db.end(true);
      });
  }
};
