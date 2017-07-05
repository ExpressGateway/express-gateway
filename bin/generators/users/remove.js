const eg = require('../../eg');
const request = require('superagent');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['remove  [options] <user_id|user_name..>', 'rm'],
      desc: 'Remove a user',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} remove [options] <user_id|user_name..>`)
          .boolean('q')
          .describe('q', 'Only show user ID')
          .alias('q', 'quiet')
          .group(['q', 'h'], 'Options:')
    });
  }

  prompting () {
    return this._remove();
  }

  _remove () {
    const argv = this.argv;
    const userIds = Array.isArray(argv.user_id)
      ? argv.user_id
      : [argv.user_id];

    const removalCount = userIds.length;
    let removalsCompleted = 0;

    const self = this;
    return new Promise(resolve => {
      userIds.forEach(function (userId) {
        request
          .del('http://localhost:' + self.eg.config.gatewayConfig.admin.port + '/users/' + argv.user_id)
          .then(res => {
            let user = res.body;
            removalsCompleted++;

            if (user) {
              if (!argv.q) {
                self.log.ok(`Removed ${userId}`);
              } else {
                self.log(user.id);
              }
            }

            if (removalsCompleted === removalCount) {
              self.eg.exit();
              resolve(); // don't propagate errors
            }
          })
          .catch(err => {
            removalsCompleted++;

            self.log.error(err.message);

            if (removalsCompleted === removalCount) {
              self.eg.exit();
              resolve(); // don't propagate errors
            }
          });
      });
    });
  }
};
