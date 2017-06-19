/* eslint-disable no-console */

const common = require('../../common');
const chalk = require('chalk');
const inquirer = require('inquirer');

module.exports = {
  command: 'create [options]',
  desc: 'Create a user',
  builder: yargs => common(
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
  ).argv,
  handler: argv => {
    if (argv.stdin) {
      createFromStdin(argv);
    } else {
      let propertyValues = [];

      if (argv.p) {
        propertyValues = Array.isArray(argv.p) ? argv.p : [argv.p];
      }

      let user = {};

      propertyValues.forEach(p => {
        const equalIndex = p.indexOf('=');

        if (!equalIndex) {
          console.error('invalid property option:', p);
          return;
        }

        const key = p.substring(0, equalIndex);
        const value = p.substring(equalIndex + 1);

        user[key] = value;
      });

      const db = require('../../../db').getDb();
      insert(user)
        .then(newUser => {
          console.log(argv.q ? newUser.id : `Created ${newUser.username}`);
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
            let user = JSON.parse(line);

            const options = {
              skipPrompt: true,
              isLast: index === lines.length - 1
            };

            return insert(user, options);
          });

    if (!promises.length) {
      return;
    }

    const db = require('../../../db').getDb();

    let promisesCount = promises.length;
    let promisesCompleted = 0;

    promises.forEach(promise => {
      promise
          .then(newUser => {
            promisesCompleted++;

            if (newUser) {
              console.log(argv.q ? newUser.id : `Created ${newUser.username}`);
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

const insert = (user, options) => {
  // TODO: Pull this from config-loader.
  const config = require('../../../config/config.model');
  const userService = require('../../../consumers')(config).userService;

  options = options || {};
  options.skipPrompt = options.skipPrompt || false;

  let questions = [];

  if (!options.skipPrompt) {
    let shouldPrompt = false;
    let missingProperties = [];

    let configProperties = Object.assign({ username: { isRequired: true } },
              config.users.properties);
    for (const prop in configProperties) {
      const descriptor = configProperties[prop];
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

  const prompt = inquirer.createPromptModule();
  return prompt(questions)
        .then(answers => {
          user = Object.assign(user, answers);
          return userService.insert(user);
        });
};
