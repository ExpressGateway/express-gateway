const eg = require('../../eg');
const request = require('superagent');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'info <user_id|user_name> [options]',
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
    const argv = this.argv;

    return request
      .get(this.adminApiBaseUrl + '/users/' + argv.user_id)
      .then(res => {
        let user = res.body;
        if (user) {
          if (!argv.q) {
            this.log(JSON.stringify(user, null, 2));
          } else {
            this.log(user.id);
          }
        }

        this.eg.exit();
      })
      .catch(err => {
        this.log.error(err.message);
        this.eg.exit();
      });
  }
};
