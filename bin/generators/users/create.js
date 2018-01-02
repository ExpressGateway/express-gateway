const eg = require('../../eg');
const SCHEMA = 'http://express-gateway.io/models/users.json';

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
          .example(`cat all_users.json | $0 ${process.argv[2]} create --stdin`)
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
            const user = JSON.parse(line);

            const options = {
              skipPrompt: true,
              isLast: index === lines.length - 1
            };

            return this._promptAndValidate(user, SCHEMA, options).then(this.admin.users.create).then(newUser => {
              if (newUser) {
                if (!argv.q) {
                  this.log.ok(`Created ${newUser.username}`);
                } else {
                  this.stdout(newUser.id);
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
  }

  _createFromCommandLine () {
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
    return this._promptAndValidate(user, SCHEMA)
      .then(this.admin.users.create)
      .then(newUser => {
        if (!argv.q) {
          this.log.ok(`Created ${newUser.id}`);
          this.stdout(JSON.stringify(newUser, null, 2));
        } else {
          this.stdout(newUser.id);
        }
      })
      .catch(err => {
        this.log.error((err.response && err.response.error && err.response.error.text) || err.message);
      });
  }
};
