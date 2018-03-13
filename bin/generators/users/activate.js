const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'activate [options] <user_id|user_name..>',
      desc: 'Activate a user',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} activate [options] <user_id|user_name..>`)
          .positional('user_name', { type: 'string' })
    });
  }

  prompting () {
    const argv = this.argv;

    const userIds = Array.isArray(argv.user_id)
      ? argv.user_id
      : [argv.user_id];

    return Promise.all(userIds.map((userId) => {
      return this.admin.users.activate(userId)
        .then(res => {
          const status = res.status;

          if (status) {
            if (argv.q) {
              this.stdout(userId);
            } else {
              this.log.ok(`${status} ${userId}`);
            }
          }
        })
        .catch(err => {
          this.log.error(err.message);
        });
    }));
  }
};
