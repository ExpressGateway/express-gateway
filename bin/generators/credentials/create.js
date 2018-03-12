const eg = require('../../eg');
const SCHEMA = 'http://express-gateway.io/models/credentials.json';

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
          .example(`cat all_apps.json | $0 ${process.argv[2]} create --stdin`)
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

    const credential = {};

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

    return this._promptAndValidate(credential, SCHEMA)
      .then((credential) => {
        if (credential.scopes) {
          credential.scopes = Array.isArray(credential.scopes) ? credential.scopes : [credential.scopes];
        }
        return this.admin.credentials.create(argv.consumer, argv.type, credential);
      })
      .then((data) => this._output(data))
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
            const credential = JSON.parse(line);
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

            return this._promptAndValidate(credential, SCHEMA, options)
              .then((credential) => this.admin.credentials.create(options.consumer, options.type, credential))
              .then(newCredential => {
                this._output(newCredential);
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

  _output (credential, options) {
    const argv = this.argv;
    if (!argv.q) {
      this.log.ok(`Created ${credential.id || credential.keyId}`);
      this.stdout(JSON.stringify(credential, null, 2));
    } else {
      if (argv.type === 'key-auth' || argv.type === 'jwt') {
        this.stdout(`${credential.keyId}:${credential.keySecret}`);
      } else if (argv.type === 'basic-auth') {
        this.stdout(`${credential.id}:${credential.password}`);
      }
    }
  }
};
