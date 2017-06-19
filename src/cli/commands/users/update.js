/* eslint-disable no-console */

const common = require('../../common');
const chalk = require('chalk');
const inquirer = require('inquirer');

module.exports = {
  command: 'update <user_id|user_name> [options]',
  desc: 'Update a user',
  builder: yargs => common(
    yargs
      .usage(`Usage: $0 ${process.argv[2]} <user_id|user_name> [options]`)
      .example(`$0 ${process.argv[2]} update jdoe -p 'firstname=John'`)
      .string('p')
      .boolean(['q', 'no-color'])
      .describe('p', 'User property in the form [-p \'foo=bar\']')
      .describe('q', 'Only show user ID')
      .describe('no-color', 'Disable color in prompts')
      .alias('p', 'property')
      .alias('q', 'quiet')
      .group(['p', 'q', 'no-color', 'h'], 'Options:')
  ).argv,
  handler: argv => {
    // TODO: Pull this from config-loader.
    const config = require('../../../config/config.model');
    const db = require('../../../db').getDb();
    const userService = require('../../../consumers')(config).userService;

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

    userService
          .get(argv.user_id)
          .then(foundUser => {
            if (foundUser) {
              return foundUser;
            }

            return userService.find(argv.user_id);
          })
          .then(foundUser => {
            if (foundUser) {
              let missingProperties = [];
              for (const prop in config.users.properties) {
                const descriptor = config.users.properties[prop];
                missingProperties.push({ name: prop, descriptor: descriptor });
              }

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

              return inquirer.prompt(questions)
                .then(answers => {
                  user = Object.assign(user, answers);
                  return userService.update(foundUser.id, user)
                    .then(() => userService.get(foundUser.id));
                });
            }
          })
          .then(updatedUser => {
            if (updatedUser) {
              if (argv.q) {
                console.log(updatedUser.id);
              } else {
                console.log(`Updated ${argv.user_id}`);
              }
            }

            return db.endAsync(true);
          })
          .catch(err => {
            console.error(err);
            return db.endAsync(true);
          });
  }
};
