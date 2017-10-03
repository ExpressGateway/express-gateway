const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'list [options]',
      description: 'List users',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} list [options]`)
          .example(`$0 ${process.argv[2]} list`)
    });
  }
  prompting () {
    return this.admin.users.list()
      .then(data => {
        const users = data.users;
        if (!users || !users.length) {
          return this.stdout('You have no users');
        }
        users.forEach(u => {
          if (this.argv.q) {
            this.stdout(u.username);
          } else {
            this.stdout(JSON.stringify(u, null, 2));
          }
        });
      })
      .catch(err => {
        this.log.error(err.message);
      });
  }
};
