const eg = require('../../eg');
const request = require('superagent');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'info [options] <app_id>',
      desc: 'Show details for a single application',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} info [options] <app_id>`)
          .group(['h'], 'Options:')
    });
  }

  prompting () {
    const argv = this.argv;

    return request
      .get('http://localhost:' + this.eg.config.gatewayConfig.admin.port + '/apps/' + argv.app_id)
      .then(res => {
        let app = res.body;
        if (app) {
          this.log(JSON.stringify(app, null, 2));
        }

        this.eg.exit();
      })
      .catch(err => {
        this.log.error(err.message);
        this.eg.exit();
      });
  }
};
