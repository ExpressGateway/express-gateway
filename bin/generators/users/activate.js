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
    const argv = this.env.argv;
    const userService = eg.services.user;

    const userIds = Array.isArray(argv.user_id)
      ? argv.user_id
      : [argv.user_id];

    const self = this;
    return new Promise(resolve => {
      const activateCount = userIds.length;
      let activationsCompleted = 0;

      userIds.forEach(function (userId) {
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
              return userService.activate(user.id)
                .then(() => {
                  return userService.get(user.id);
                });
            }
          })
          .then(user => {
            activationsCompleted++;

            if (user) {
              if (!argv.q) {
                self.log.ok(`Activated ${userId}`);
              } else {
                self.log(user.id);
              }
            }

            if (activationsCompleted === activateCount) {
              eg.exit();
              resolve(); // don't propagate rejections
            }
          })
          .catch(err => {
            activationsCompleted++;

            self.log.error(err.message);

            if (activationsCompleted === activateCount) {
              eg.exit();
              resolve(); // don't propagate rejections
            }
          });
      });
    });
  }
};
