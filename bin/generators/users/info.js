const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'info <user_id> [options]',
      desc: 'Show details for a single user',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} info <user_id|user_name> [options]`)
          .describe('q', 'Only show user ID')
          .alias('q', 'quiet')
          .group(['q', 'h'], 'Options:')
    });
  }

  prompting () {
    const userService = eg.services.user;
    const argv = this.env.argv;

    return userService
      .find(argv.user_id)
      .then(user => {
        if (!user) {
          return userService.get(argv.user_id);
        }

        return user;
      })
      .then(user => {
        if (user) {
          if (!argv.q) {
            this.log(JSON.stringify(user, null, 2));
          } else {
            this.log(user.id);
          }
        }

        eg.exit();
      })
      .catch(err => {
        this.log.error(err.message);
        eg.exit();
      });
  }
};
