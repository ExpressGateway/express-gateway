const eg = require('../../eg');
const request = require('superagent');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'deactivate [options] <user_id|user_name..>',
      desc: 'Deactivate a user',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} deactivate [options] <user_id|user_name..>`)
          .boolean('q')
          .describe('q', 'Only show user ID')
          .alias('q', 'quiet')
          .group(['q', 'h'], 'Options:')
    });
  }

  prompting () {
    return this._deactivate();
  }

  _deactivate () {
    const argv = this.argv;

    const userIds = Array.isArray(argv.user_id)
      ? argv.user_id
      : [argv.user_id];

    const deactivateCount = userIds.length;
    let deactivationsCompleted = 0;

    const self = this;
    return new Promise(resolve => {
      userIds.forEach(userId => {
        return request
          .put('http://localhost:' + self.eg.config.gatewayConfig.admin.port + '/users/' + argv.user_id + '/status')
          .send({status: false})
          .then(res => {
            let status = res.body;
            deactivationsCompleted++;

            if (status) {
              self.log.ok(`Deactivated ${userId}`);
            }

            if (deactivationsCompleted === deactivateCount) {
              self.eg.exit();
            }
          })
          .catch(err => {
            deactivationsCompleted++;

            self.log.error(err.message);

            if (deactivationsCompleted === deactivateCount) {
              self.eg.exit();
            }
          });
      });
    });
  }
};
