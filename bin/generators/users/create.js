const chalk = require('chalk');
const eg = require('../../eg');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.stdin = process.stdin;
    this.configureCommand({
      command: 'create [options]',
      description: 'Create a user',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} create [options]`)
          .example(`$0 ${process.argv[2]} create`)
          .example(`$0 ${process.argv[2]} create -p 'username=jdoe' ` +
            '-p \'firstname=Jane\' -p \'lastname=Doe\'')
          .example('echo \'{"username":"jdoe","firstname":"Jane"}\'' +
            ` | $0 ${process.argv[2]} create --stdin`)
          .example(`cat all_users.jsonl | $0 ${process.argv[2]} create --stdin`)
          .string('p')
          .boolean(['stdin'])
          .describe('p', 'User property in the form [-p \'foo=bar\']')
          .describe('stdin', 'Import newline-delimited JSON via standard input')
          .alias('p', 'property')
          .group(['p', 'stdin'], 'Options:')
    });
  }

  prompting () {
    if (!this.argv.stdin) {
      return this._createFromCommandLine();
    } else {
      return this._createFromStdin();
    }
  }

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
            let user = JSON.parse(line);

            const options = {
              skipPrompt: true,
              isLast: index === lines.length - 1
            };

            return this._insert(user, options).then(newUser => {
              if (newUser) {
                if (!argv.q) {
                  this.log.ok(`Created ${newUser.username}`);
                } else {
                  this.log(newUser.id);
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
  }

  _createFromCommandLine () {
    const argv = this.argv;
    let propertyValues = [];

    if (argv.p) {
      propertyValues = Array.isArray(argv.p) ? argv.p : [argv.p];
    }

    let user = {};

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
      this.eg.exit();
      return;
    }
    return this._insert(user)
      .then(newUser => {
        if (!argv.q) {
          this.log.ok(`Created ${newUser.username}`);
        } else {
          this.log(newUser.id);
        }
        this.eg.exit();
      })
      .catch(err => {
        this.log.error((err.response && err.response.error && err.response.error.text) || err.message);
        this.eg.exit();
      });
  }
  _insert (user, options) {
    const models = this.eg.config.models;

    options = options || {};
    options.skipPrompt = options.skipPrompt || false;

    let questions = [];

    if (!options.skipPrompt) {
      let shouldPrompt = false;
      let missingProperties = [];

      let configProperties = Object.assign({ username: { isRequired: true } },
                models.users.properties);

      Object.keys(configProperties).forEach(prop => {
        const descriptor = configProperties[prop];
        if (!user[prop]) {
          if (!shouldPrompt && descriptor.isRequired) {
            shouldPrompt = true;
          }

          missingProperties.push({ name: prop, descriptor: descriptor });
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

    if (questions.length > 0) {
      // handle CTRL-C
      this.stdin.on('data', key => {
        if (key.toString('utf8') === '\u0003') {
          this.eg.exit();
        }
      });
    }
    return this.prompt(questions)
      .then(answers => {
        user = Object.assign(user, answers);
        return this.admin.users.create(user);
      });
  }
};
