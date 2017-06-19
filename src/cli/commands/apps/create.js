/* eslint-disable no-console */

const common = require('../../common');
const chalk = require('chalk');
const inquirer = require('inquirer');

module.exports = {
  command: 'create [options]',
  desc: 'Create an application',
  builder: yargs => common(
    yargs
      .usage(`Usage: $0 ${process.argv[2]} create [options]`)
      .example(`$0 ${process.argv[2]} create -u jdoe`)
      .example(`$0 ${process.argv[2]} create -u jdoe -p 'name=mobile-app' ` +
        '-p \'redirectUri=http://localhost/cb\'')
      .example('echo \'{"user":"jdoe","name":"mobile-app"}\'' +
        ` | $0 ${process.argv[2]} create --stdin`)
      .example(`cat all_apps.jsonl | $0 ${process.argv[2]} create --stdin`)
      .string(['p', 'u'])
      .boolean(['q', 'stdin', 'no-color'])
      .describe('u', 'User ID or username associated with the app')
      .describe('p', 'App property in the form [-p \'foo=bar\']')
      .describe('q', 'Only show app ID')
      .describe('stdin', 'Import newline-delimited JSON via standard input')
      .describe('no-color', 'Disable color in prompts')
      .alias('u', 'user').nargs('u', 1)
      .alias('p', 'property')
      .alias('q', 'quiet')
      .group(['u', 'p', 'stdin', 'q', 'no-color', 'h'], 'Options:')
      .check((args, opts) => {
        if (!args.stdin && !args.user) {
          throw new Error('must include --stdin or -u, --user');
        }
        return true;
      })
  ).argv,
  handler: argv => {
    if (argv.stdin) {
      createFromStdin(argv);
    } else {
      let propertyValues = [];

      if (argv.p) {
        propertyValues = Array.isArray(argv.p) ? argv.p : [argv.p];
      }

      let app = {};

      propertyValues.forEach(p => {
        const equalIndex = p.indexOf('=');

        if (!equalIndex) {
          console.error('invalid property option:', p);
          return;
        }

        const key = p.substring(0, equalIndex);
        const value = p.substring(equalIndex + 1);

        app[key] = value;
      });

      const db = require('../../../db').getDb();
      insert(app, { user: argv.user })
        .then(newApp => {
          console.log(argv.q ? newApp.id : `Created ${newApp.id}`);
          db.end(true);
        })
        .catch(err => {
          console.error(err.message);
          db.end(true);
        });
    }
  }
};

const createFromStdin = (argv) => {
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

            return insert(app, options);
          });

    if (!promises.length) {
      return;
    }

    const db = require('../../../db').getDb();

    let promisesCount = promises.length;
    let promisesCompleted = 0;

    promises.forEach(promise => {
      promise
          .then(newApp => {
            promisesCompleted++;

            if (newApp) {
              console.log(argv.q ? newApp.id : `Created ${newApp.id}`);
            }

            if (promisesCompleted === promisesCount) {
              db.end(true);
            }
          })
          .catch(err => {
            promisesCompleted++;

            console.error(err.message);

            if (promisesCompleted === promisesCount) {
              db.end(true);
            }
          });
    });
  });
};

const insert = (app, options) => {
  // TODO: Pull this from config-loader.
  const config = require('../../../config/config.model');
  const applicationService = require('../../../consumers')(config).applicationService;
  const userService = require('../../../consumers')(config).userService;

  options = options || {};
  options.skipPrompt = options.skipPrompt || false;

  let questions = [];

  if (!options.skipPrompt) {
    let shouldPrompt = false;
    let missingProperties = [];

    let configProperties = config.applications.properties;
    for (const prop in configProperties) {
      const descriptor = configProperties[prop];
      if (!app[prop]) {
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

  const user = options.user;
  const prompt = inquirer.createPromptModule();
  return prompt(questions)
        .then(answers => {
          app = Object.assign(app, answers);
          return userService.find(user)
            .then(foundUser => {
              if (!foundUser) {
                return userService.get(user)
                  .then(foundUser => foundUser.id);
              }

              return foundUser.id;
            })
            .then(userId => {
              return applicationService.insert(app, userId);
            });
        });
};
