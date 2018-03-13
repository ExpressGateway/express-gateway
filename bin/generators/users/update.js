const eg = require('../../eg');
const SCHEMA = 'http://express-gateway.io/models/users.json';

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'update <user_id|user_name> [options]',
      desc: 'Update a user',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} update <user_id|user_name> [options]`)
          .example(`$0 ${process.argv[2]} update jdoe -p 'firstname=John'`)
          .string('p')
          .describe('p', 'User property in the form [-p \'foo=bar\']')
          .alias('p', 'property')
          .group(['p'], 'Options:')
          .positional('user_id', { type: 'string' })
    });
  }

  prompting () {
    return this._update();
  }

  _update () {
    const argv = this.argv;

    let propertyValues = [];

    if (argv.p) {
      propertyValues = Array.isArray(argv.p) ? argv.p : [argv.p];
    }

    const user = {};

    let hasInvalidProperty = false;

    propertyValues.forEach(p => {
      const equalIndex = p.indexOf('=');

      if (equalIndex === -1 || equalIndex === p.length - 1) {
        this.log.error('invalid property option:', p);
        hasInvalidProperty = true;
        return;
      }

      const key = p.substring(0, equalIndex);
      const value = p.substring(equalIndex + 1);

      user[key] = value;
    });

    if (hasInvalidProperty) {
      return;
    }

    return this.admin.users.info(argv.user_id)
      .catch(() => { throw new Error(`User not found: ${argv.user_id}`); })
      .then(() => this._promptAndValidate(user, SCHEMA))
      .then((user) => this.admin.users.update(argv.user_id, user))
      .then(updatedUser => {
        if (updatedUser) {
          if (argv.q) {
            this.stdout(updatedUser.id);
          } else {
            this.log.ok(`Updated ${argv.user_id}`);
          }
        }
      })
      .catch((err) => {
        if (!argv.q) {
          this.log.error(err.message);
        };
      });
  }
};
