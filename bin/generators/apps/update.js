const eg = require('../../eg');
const SCHEMA = 'http://express-gateway.io/models/applications.json';

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.configureCommand({
      command: 'update <app_id> [options]',
      desc: 'Update an application',
      builder: yargs =>
        yargs
          .usage('Usage: $0 apps update <app_id> [options]')
          .string('p')
          .describe('p', 'App property in the form [-p \'foo=bar\']')
          .alias('p', 'property')
          .group(['p'], 'Options:')
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

    const app = {};

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

      app[key] = value;
    });

    if (hasInvalidProperty) {
      return;
    }

    return this.admin.apps.info(argv.app_id)
      .catch(() => { throw new Error(`App not found: ${argv.app_id}`); })
      .then(() => this._promptAndValidate(app, SCHEMA))
      .then(app => this.admin.apps.update(argv.app_id, app))
      .then(res => {
        if (!argv.q) {
          this.log.ok(`Updated ${argv.app_id}`);
        } else {
          this.stdout(argv.app_id);
        }
      })
      .catch((err) => {
        if (!argv.q) {
          this.log.error(err.message);
        };
      });
  }
};
