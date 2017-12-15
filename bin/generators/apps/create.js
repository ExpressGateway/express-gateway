const eg = require('../../eg');
const SCHEMA = 'http://express-gateway.io/models/applications.json';

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.stdin = process.stdin;

    this.configureCommand({
      command: 'create [options]',
      desc: 'Create an application',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} create [options]`)
          .example(`$0 ${process.argv[2]} create -u jdoe`)
          .example(`$0 ${process.argv[2]} create -u jdoe -p 'name=mobile-app' ` +
          '-p \'redirectUri=http://localhost/cb\'')
          .example('echo \'{"user":"jdoe","name":"mobile-app"}\'' +
          ` | $0 ${process.argv[2]} create --stdin`)
          .example(`cat all_apps.json | $0 ${process.argv[2]} create --stdin`)
          .string(['p', 'u'])
          .boolean(['stdin'])
          .describe('u', 'User ID or username associated with the app')
          .describe('p', 'App property in the form [-p \'foo=bar\']')
          .describe('stdin', 'Import newline-delimited JSON via standard input')
          .alias('u', 'user').nargs('u', 1)
          .alias('p', 'property')
          .group(['u', 'p', 'stdin'], 'Options:')
          .check((args, opts) => {
            if (!args.stdin && !args.user) {
              throw new Error('must include --stdin or -u, --user');
            }
            return true;
          })
    });
  }

  initializing () {
    if (this.argv.stdin) {
      return this._createFromStdin();
    }
  }

  prompting () {
    if (!this.argv.stdin) {
      return this._createFromCommandLine();
    }
  }

  _createFromCommandLine () {
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

    return this._promptAndValidate(app, SCHEMA)
      .then((app) => this.admin.apps.create(argv.user, app))
      .then(newApp => {
        if (!argv.q) {
          this.log.ok(`Created ${newApp.id}`);
          this.stdout(JSON.stringify(newApp, null, 2));
        } else {
          this.stdout(newApp.id);
        }
      })
      .catch(err => {
        this.log.error((err.response && err.response.error && err.response.error.text) || err.message);
      });
  };

  _createFromStdin () {
    const argv = this.argv;
    this.stdin.setEncoding('utf8');

    const bufs = [];

    this.stdin.on('readable', () => {
      const chunk = this.stdin.read();

      if (chunk) {
        bufs.push(chunk);
      }
    });
    return new Promise((resolve, reject) => {
      this.stdin.on('end', () => {
        const lines = bufs.join('').split('\n');
        const promises = lines
          .filter(line => line.length > 0)
          .map((line, index) => {
            const app = JSON.parse(line);
            let user;

            if (app.user) {
              user = app.user;
              delete app.user;
            } else {
              user = argv.user;
            }

            const options = {
              skipPrompt: true,
              isLast: index === lines.length - 1,
              user: user
            };

            return this._promptAndValidate(app, SCHEMA, options)
              .then((app) => this.admin.apps.create(options.user, app))
              .then(newApp => {
                if (newApp) {
                  if (!argv.q) {
                    this.log.ok(`Created ${newApp.id}`);
                  } else {
                    this.stdout(newApp.id);
                  }
                }
              })
              .catch(err => {
                this.log.error((err.response && err.response.error && err.response.error.text) || err.message);
              });
          });

        const p = Promise.all(promises);
        resolve(p);
      });
    });
  };
};
