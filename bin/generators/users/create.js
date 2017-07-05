const chalk = require('chalk');
const eg = require('../../eg');
const request = require('superagent');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

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
          .boolean(['q', 'stdin', 'no-color'])
          .describe('p', 'User property in the form [-p \'foo=bar\']')
          .describe('q', 'Only show user ID')
          .describe('stdin', 'Import newline-delimited JSON via standard input')
          .describe('no-color', 'Disable color in prompts')
          .alias('p', 'property')
          .alias('q', 'quiet')
          .group(['p', 'stdin', 'q', 'no-color', 'h'], 'Options:')
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

  _createFromStdin () {
    const argv = this.argv;
    process.stdin.setEncoding('utf8');

    let bufs = [];

    process.stdin.on('readable', () => {
      const chunk = process.stdin.read();

      if (chunk) {
        bufs.push(chunk);
      }
    });

    process.stdin.on('end', () => {
      let lines = bufs.join('').split('\n');

      let promises = lines
            .filter(line => line.length > 0)
            .map((line, index) => {
              let user = JSON.parse(line);

              const options = {
                skipPrompt: true,
                isLast: index === lines.length - 1
              };

              return this._insert(user, options);
            });

      if (!promises.length) {
        return;
      }

      let promisesCount = promises.length;
      let promisesCompleted = 0;

      return new Promise(resolve => {
        promises.forEach(promise => {
          promise
              .then(newUser => {
                promisesCompleted++;

                if (newUser) {
                  if (!argv.q) {
                    this.log.ok(`Created ${newUser.username}`);
                  } else {
                    this.log(newUser.id);
                  }
                }

                if (promisesCompleted === promisesCount) {
                  this.eg.exit();
                  resolve(); // don't propagate rejections
                }
              })
              .catch(err => {
                promisesCompleted++;

                this.log.error(err.message);

                if (promisesCompleted === promisesCount) {
                  this.eg.exit();
                  resolve(); // don't propagate rejections
                }
              });
        });
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
        this.log.error(err.message);
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
      for (const [prop, descriptor] of Object.entries(configProperties)) {
        if (!user[prop]) {
          if (!shouldPrompt && descriptor.isRequired) {
            shouldPrompt = true;
          }

          missingProperties.push({ name: prop, descriptor: descriptor });
        }
      }

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
      process.stdin.on('data', key => {
        if (key.toString('utf8') === '\u0003') {
          this.eg.exit();
        }
      });
    }

    return this.prompt(questions)
      .then(answers => {
        user = Object.assign(user, answers);
        return request
          .post('http://localhost:' + this.eg.config.gatewayConfig.admin.port + '/users')
          .send(user)
          .then(res => {
            this.log(res.body);
            return res.body;
          });
      });
  }
};
