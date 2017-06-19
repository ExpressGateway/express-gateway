const common = require('../../common');
const EgGenerator = require('../../eg_generator');
const util = require('../../util');

module.exports = class extends EgGenerator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'info [options] <app_id>',
      desc: 'Show details for a single application',
      builder: yargs => common(
        yargs
          .usage(`Usage: $0 ${process.argv[2]} info [options] <app_id>`)
          .group(['h'], 'Options:'))
    });
  }

  prompting () {
    const argv = this.options.env.argv;
    const appService = require('../../../services').application;

    return appService
      .get(argv.app_id)
      .then(app => {
        if (app) {
          this.log(JSON.stringify(app, null, 2));
        }

        util.exit();
      })
      .catch(err => {
        this.log.error(err.message);
        util.exit();
      });
  }
};
