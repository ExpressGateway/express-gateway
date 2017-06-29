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
    const argv = this.env.argv;
    const userService = eg.services.user;

    const userIds = Array.isArray(argv.user_id)
      ? argv.user_id
      : [argv.user_id];

    const deactivateCount = userIds.length;
    let deactivationsCompleted = 0;

    const self = this;
    return new Promise(resolve => {
      userIds.forEach(userId => {
        userService
          .find(userId)
          .then(user => {
            if (!user) {
              return userService.get(userId);
            }

            return user;
          })
          .then(user => {
            if (user) {
              return userService.deactivate(user.id)
                .then(() => {
                  return userService.get(user.id);
                });
            }
          })
          .then(user => {
            deactivationsCompleted++;

            if (user) {
              if (!argv.q) {
                self.log.ok(`Deactivated ${userId}`);
              } else {
                self.log(user.id);
              }
            }

            if (deactivationsCompleted === deactivateCount) {
              eg.exit();
            }
          })
          .catch(err => {
            deactivationsCompleted++;

            self.log.error(err.message);

            if (deactivationsCompleted === deactivateCount) {
              eg.exit();
            }
          });
      });
    });
  }
};
