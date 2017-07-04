const chalk = require('chalk');
const eg = require('../../eg');
const request = require('superagent');
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
          .boolean(['q', 'no-color'])
          .describe('p', 'App property in the form [-p \'foo=bar\']')
          .describe('q', 'Only show app ID')
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
    const models = this.eg.config.models;

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

    return request
      .get(this.adminApiBaseUrl + '/apps/' + argv.app_id)
      .then(res => {
        let foundApp = res.body;
        if (!foundApp) {
          if (!argv.q) {
            this.log.error(`App not found: ${argv.app_id}`);
          }
          this.eg.exit();
          return;
        }

        let questions = [];

        let shouldPrompt = false;
        let missingProperties = [];

        let configProperties = models.applications.properties;
        Object.keys(configProperties).forEach(prop => {
          const descriptor = configProperties[prop];
          if (!app[prop]) {
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
              default: foundApp[p.name] || p.defaultValue,
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
            app = Object.assign(app, answers);
            return request
              .put(this.adminApiBaseUrl + '/apps/' + argv.app_id)
              .send(app);
          })
          .then(res => {
            if (!argv.q) {
              this.log.ok(`Updated ${argv.app_id}`);
            } else {
              this.log(argv.app_id);
            }

            this.eg.exit();
          })
          .catch(err => {
            this.log.error(err.message);
            this.eg.exit();
          });
      });
  }
};
