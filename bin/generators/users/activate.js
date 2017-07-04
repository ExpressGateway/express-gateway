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

    return Promise.all(userIds.map((userId) => {
      return this.sdk.users.activate(userId)
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
