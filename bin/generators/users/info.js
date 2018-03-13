const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'info <user_id|user_name> [options]',
      desc: 'Show details for a single user',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} info <user_id|user_name> [options]`)
          .positional('user_name', { type: 'string' })
    });
  }

  prompting () {
    const argv = this.argv;

    return this.admin.users.info(argv.user_id)
      .then(user => {
        if (user) {
          if (!argv.q) {
            this.stdout(JSON.stringify(user, null, 2));
          } else {
            this.stdout(user.id);
          }
        }
      })
      .catch(err => {
        this.log.error(err.message);
      });
  }
};
