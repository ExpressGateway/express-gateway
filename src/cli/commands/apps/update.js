/* eslint-disable no-console */

const common = require('../../common');
const chalk = require('chalk');
const inquirer = require('inquirer');

module.exports = {
  command: 'update <app_id> [options]',
  desc: 'Update an application',
  builder: yargs => common(
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
  ).argv,
  handler: argv => {
    const db = require('../../../db').getDb();

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

    update(app, { id: argv.app_id })
      .then(newApp => {
        console.log(argv.q ? argv.app_id : `Updated ${argv.app_id}`);
        db.end(true);
      })
      .catch(err => {
        console.error(err.message);
        db.end(true);
      });
  }
};

const update = (app, options) => {
  // TODO: Pull this from config-loader.
  const config = require('../../../config/config.model');
  const applicationService = require('../../../consumers')(config).applicationService;

  options = options || {};

  let questions = [];

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

  const appId = options.id;
  const prompt = inquirer.createPromptModule();
  return prompt(questions)
        .then(answers => {
          app = Object.assign(app, answers);
          return applicationService.update(appId, app);
        });
};
