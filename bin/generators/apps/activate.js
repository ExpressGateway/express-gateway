const eg = require('../../eg');
const request = require('superagent');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'activate [options] <app_id..>',
      desc: 'Activate an application',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} activate [options] <app_id..>`)
          .boolean('q')
          .describe('q', 'Only show app ID')
          .alias('q', 'quiet')
          .group(['q', 'h'], 'Options:')
    });
  }

  prompting () {
    return this._activate();
  }

  _activate () {
    const argv = this.argv;

    const appIds = Array.isArray(argv.app_id)
      ? argv.app_id
      : [argv.app_id];

    const self = this;
    return new Promise(resolve => {
      const activateCount = appIds.length;
      let activationsCompleted = 0;

      appIds.forEach(function (appId) {
        request
          .put(self.adminApiBaseUrl + '/apps/' + appId + '/status')
          .send({status: true})
          .then(res => {
            let status = res.body.status;
            activationsCompleted++;

            if (status) {
              self.log.ok(`${status} ${appId}`);
            }

            if (activationsCompleted === activateCount) {
              self.eg.exit();
              resolve(); // don't propagate errors
            }
          })
          .catch(err => {
            activationsCompleted++;

            self.log.error(err.message);

            if (activationsCompleted === activateCount) {
              self.eg.exit();
              resolve(); // don't propagate errors
            }
          });
      });
    });
  }
};
