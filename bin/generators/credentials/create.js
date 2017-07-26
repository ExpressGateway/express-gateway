const chalk = require('chalk');
const eg = require('../../eg');
module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.stdin = process.stdin;

    this.configureCommand({
      command: 'create [options]',
      desc: 'Create credentials for user or app with specified type',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} create [options]`)
          .example(`$0 ${process.argv[2]} create -c jdoe -t key-auth`)
          .example(`echo '{"consumer":"jdoe", "type": "key-auth"}'` +
             `| $0 ${process.argv[2]} create --stdin`)
          .example(`echo '{"consumer":"jdoe", "type": "key-auth", "scopes":["existingScope"]}'` +
             `| $0 ${process.argv[2]} create --stdin`)
          .example(`cat all_apps.jsonl | $0 ${process.argv[2]} create --stdin`)
          .example(`$0 ${process.argv[2]} create -u jdoe -p 'scopes=existingScope'`)
          .string(['p', 'c', 't'])
          .boolean(['stdin'])
          .describe('c', 'Consumer ID: can be User ID or username or app ID')
          .describe('t', 'Type of credential: can be one of: oauth2, basic-auth, key-auth')
          .describe('p', 'App property in the form [-p \'foo=bar\']')
          .describe('stdin', 'Import newline-delimited JSON via standard input')
          .alias('c', 'consumer').nargs('c', 1)
          .alias('t', 'type').nargs('t', 1)
          .alias('p', 'property')
          .group(['c', 'p', 'stdin', 't'], 'Options:')
          .check((args, opts) => {
            if (args.stdin) return true; // direct input from stdin, no validation

            if (!(args.t && args.c)) {
              throw new Error('must include either --stdin or -c with -t (--consumer with --type)');
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

    let credential = {};

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

      // this is for values like [], {}
      try {
        credential[key] = JSON.parse(value);
      } catch (err) {
        credential[key] = value;
      }
    });

    if (hasInvalidProperty) {
      return;
    }

    return this._insert(credential, { consumer: argv.consumer, type: argv.type })
    .then(newCredential => {
      this._output(newCredential);
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
            let credential = JSON.parse(line);
            let consumer, type;

            if (credential.consumer) {
              consumer = credential.consumer;
              delete credential.consumer;
            } else {
              consumer = argv.consumer;
            }
            if (credential.type) {
              type = credential.type;
              delete credential.type;
            } else {
              type = argv.type;
            }

            const options = {
              skipPrompt: true,
              isLast: index === lines.length - 1,
              consumer,
              type
            };

            return this._insert(credential, options)
              .then(newCredential => {
                this._output(newCredential);
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

  _output (credential, options) {
    let argv = this.argv;
    if (!argv.q) {
      this.log.ok(`Created ${credential.id || credential.keyId}}`);
      this.stdout(JSON.stringify(credential, null, 2));
    } else {
      if (argv.type === 'key-auth') {
        this.stdout(`${credential.keyId}:${credential.keySecret}`);
      } else if (argv.type === 'basic-auth') {
        this.stdout(`${credential.id}:${credential.password}`);
      }
    }
  }

  _insert (credential, options) {
    const models = this.eg.config.models;

    options = options || {};
    options.skipPrompt = options.skipPrompt || false;

    let questions = [];

    if (!options.skipPrompt) {
      let shouldPrompt = false;
      let missingProperties = [];

      let configProperties = models.credentials[this.argv.type].properties;
      Object.keys(configProperties).forEach(prop => {
        const descriptor = configProperties[prop];

        if (!credential[prop]) {
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
    return this.prompt(questions)
        .then(answers => {
          credential = Object.assign(credential, answers);
          return this.admin.credentials.create(options.consumer, options.type, credential);
        });
  };
};
