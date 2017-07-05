const eg = require('../../eg');
const request = require('superagent');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['remove [options] <app_id..>', 'rm'],
      desc: 'Remove an application',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} remove [options] <app_id..>`)
          .boolean('q')
          .describe('q', 'Only show app ID')
          .alias('q', 'quiet')
          .group(['q', 'h'], 'Options:')
    });
  }

  prompting () {
    const argv = this.argv;

    const appIds = Array.isArray(argv.app_id)
      ? argv.app_id
      : [argv.app_id];

    return new Promise((resolve, reject) => {
      const removalCount = appIds.length;
      let removalsCompleted = 0;

      let self = this;
      let errors = [];
      appIds.forEach(function (appId) {
        request
          .del('http://localhost:' + self.eg.config.gatewayConfig.admin.port + '/apps/' + appId)
          .then(res => {
            let app = res.body;
            removalsCompleted++;

            if (app) {
              if (!argv.q) {
                self.log.ok(`Removed ${appId}`);
              } else {
                self.log(app.id);
              }
            }

            if (removalsCompleted === removalCount) {
              self.eg.exit();
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
              self.eg.exit();
              reject(errors);
            }
          });
      });
    });
  }
};
