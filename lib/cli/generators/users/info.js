const common = require('../../common');
const EgGenerator = require('../../eg_generator');
const util = require('../../util');

module.exports = class extends EgGenerator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'info <user_id> [options]',
      desc: 'Show details for a single user',
      builder: yargs => common(
        yargs
          .usage(`Usage: $0 ${process.argv[2]} info <user_id|user_name> [options]`)
          .describe('q', 'Only show user ID')
          .alias('q', 'quiet')
          .group(['q', 'h'], 'Options:')
      )
    });
  }

  prompting () {
    const userService = require('../../../services').user;
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

        util.exit();
      })
      .catch(err => {
        this.log.error(err.message);
        util.exit();
      });
  }
};
