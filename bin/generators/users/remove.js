const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: ['remove  [options] <user_id|user_name..>', 'rm'],
      desc: 'Remove a user',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} remove [options] <user_id|user_name..>`)
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

    return Promise.all(userIds.map((userId) => {
      return this.sdk.users.remove(userId)
          .then(user => {
            if (user) {
              if (!argv.q) {
                this.log.ok(`Removed ${userId}`);
              } else {
                this.log(userId);
              }
            }
          })
          .catch(err => {
            this.log.error(err.message);
          });
    })).then(() => this.eg.exit());
  }
};
