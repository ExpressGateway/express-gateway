const chalk = require('chalk');
const eg = require('../../eg');
const request = require('superagent');
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
          .boolean(['q', 'no-color'])
          .describe('p', 'User property in the form [-p \'foo=bar\']')
          .describe('q', 'Only show user ID')
          .describe('no-color', 'Disable color in prompts')
          .alias('p', 'property')
          .alias('q', 'quiet')
          .group(['p', 'q', 'no-color', 'h'], 'Options:')
    });
  }

  prompting () {
    return this._update();
  }

  _update () {
    const argv = this.argv;
    const config = this.eg.config.models;

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

    return request
      .get(this.adminApiBaseUrl + '/users/' + argv.user_id)
      .then(res => {
        let foundUser = res.body;
        if (!foundUser) {
          if (!argv.q) {
            this.log.error(`User not found: ${argv.user_id}`);
          }
          this.eg.exit();
          return;
        }

        const configProperties = config.users.properties;
        let missingProperties = Object.keys(configProperties).map(prop => {
          return { name: prop, descriptor: configProperties[prop] };
        });

        let questions = [];

        if (!propertyValues.length) {
          questions = missingProperties.map(p => {
            return {
              name: p.name,
              message: `Enter a value for ${chalk.yellow(p.name)}:`,
              default: foundUser[p.name] || p.defaultValue,
              validate: input => !p.descriptor.isRequired ||
                (!!input && p.descriptor.isRequired)
            };
          });
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
              .put(this.adminApiBaseUrl + '/users/' + argv.user_id)
              .send(user)
              .then(res => {
                let updatedUser = res.body;
                return updatedUser;
              });
          });
      })
      .then(updatedUser => {
        if (updatedUser) {
          if (argv.q) {
            this.log(updatedUser.id);
          } else {
            this.log.ok(`Updated ${argv.user_id}`);
          }
        }

        this.eg.exit();
      })
      .catch(err => {
        this.log.error(err.message);
        this.eg.exit();
      });
  }
};
