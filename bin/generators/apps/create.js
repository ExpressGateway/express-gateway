const chalk = require('chalk');
const eg = require('../../eg');
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
          .example(`cat all_apps.jsonl | $0 ${process.argv[2]} create --stdin`)
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

    let app = {};

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

    return this._insert(app, {user: argv.user})
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

    let bufs = [];

    this.stdin.on('readable', () => {
      const chunk = this.stdin.read();

      if (chunk) {
        bufs.push(chunk);
      }
    });
    return new Promise((resolve, reject) => {
      this.stdin.on('end', () => {
        let lines = bufs.join('').split('\n');
        let promises = lines
          .filter(line => line.length > 0)
          .map((line, index) => {
            let app = JSON.parse(line);
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

            return this._insert(app, options).then(newApp => {
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

        let p = Promise.all(promises);
        resolve(p);
      });
    });
  };

  _insert (app, options) {
    const models = this.eg.config.models;

    options = options || {};
    options.skipPrompt = options.skipPrompt || false;

    let questions = [];

    if (!options.skipPrompt) {
      let shouldPrompt = false;
      let missingProperties = [];

      const configProperties = Object.assign({name: {isRequired: true}},
        models.applications.properties);

      Object.keys(configProperties).forEach(prop => {
        const descriptor = configProperties[prop];

        if (!app[prop]) {
          if (!shouldPrompt && descriptor.isRequired) {
            shouldPrompt = true;
          }

          missingProperties.push({name: prop, descriptor: descriptor});
        }
      });

      if (shouldPrompt) {
        questions = missingProperties.map(p => {
          const required = p.descriptor.isRequired
            ? ' [required]'
            : '';

          return {
            name: p.name,
            message: `Enter ${chalk.yellow(p.name)}${chalk.green(required)}:`,
            default: p.defaultValue,
            validate: input => !p.descriptor.isRequired ||
              (!!input && p.descriptor.isRequired)
          };
        });
      }
    }

    return this.prompt(questions)
      .then(answers => {
        app = Object.assign(app, answers);
        return this.admin.apps.create(options.user, app);
      });
  };
};
