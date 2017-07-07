const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'deactivate [options] <user_id|user_name..>',
      desc: 'Deactivate a user',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} deactivate [options] <user_id|user_name..>`)
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

    return Promise.all(userIds.map((userId) => {
      return this.sdk.users.deactivate(userId)
          .then(res => {
            let status = res.status;

            if (status) {
              if (argv.q) {
                this.log.ok(userId);
              } else {
                this.log.ok(`${status} ${userId}`);
              }
            }
          })
          .catch(err => {
            this.log.error(err.message);
          });
    })).then(() => {
      this.eg.exit();
    });
  }
};
