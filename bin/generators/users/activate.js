const eg = require('../../eg');
const request = require('superagent');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'activate [options] <user_id|user_name..>',
      desc: 'Activate a user',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} activate [options] <user_id|user_name..>`)
          .boolean('q')
          .describe('q', 'Only show user ID')
          .alias('q', 'quiet')
          .group(['q', 'h'], 'Options:')
    });
  }

  prompting () {
    return this._activate();
  }

  _activate () {
    const argv = this.argv;

    const userIds = Array.isArray(argv.user_id)
      ? argv.user_id
      : [argv.user_id];

    const self = this;
    return new Promise(resolve => {
      const activateCount = userIds.length;
      let activationsCompleted = 0;

      userIds.forEach(function (userId) {
        return request
          .put(self.adminApiBaseUrl + '/users/' + argv.user_id + '/status')
          .send({status: true})
          .then(res => {
            let status = res.body.status;
            activationsCompleted++;

            if (status) {
              self.log.ok(`${status} ${userId}`);
            }

            if (activationsCompleted === activateCount) {
              self.eg.exit();
              resolve(); // don't propagate rejections
            }
          })
          .catch(err => {
            activationsCompleted++;

            self.log.error(err.message);

            if (activationsCompleted === activateCount) {
              self.eg.exit();
              resolve(); // don't propagate rejections
            }
          });
      });
    });
  }
};
