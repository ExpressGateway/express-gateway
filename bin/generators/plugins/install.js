const eg = require('../../eg');
const PluginInstaller = require('../../../lib/plugin-installer');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.installer = PluginInstaller.create();

    this.pluginOptions = null;

    this.enablePlugin = false;
    this.addPoliciesToWhitelist = false;

    this.configureCommand({
      command: 'install <package> [options]',
      description: 'Install a plugin',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} install <package> [options]`)
          .example(`$0 ${process.argv[2]} install express-gateway-plugin-url-rewrite`)
          .option('n', {
            alias: 'enable',
            describe: 'Enable plugin in system config',
            demandOption: false,
            type: 'boolean'
          })
          .option('g', {
            alias: 'update-gateway-config',
            describe: 'Update policy whitelist in gateway config',
            demandOption: false,
            type: 'boolean'
          })
          .option('o', {
            alias: 'option',
            describe: 'User property in the form [-p \'foo=bar\']',
            demandOption: false,
            type: 'string'
          })
    });
  }

  initializing () {
    this.enablePlugin = this.argv.n || null;
    this.addPoliciesToWhitelist = this.argv.g || null;

    let optionValues = [];

    const argv = this.argv;
    if (argv.o) {
      optionValues = Array.isArray(argv.o) ? argv.o : [argv.o];
    }

    let hasInvalidProperty = false;

    if (optionValues.length) {
      this.pluginOptions = {};

      optionValues.forEach(o => {
        const equalIndex = o.indexOf('=');

        if (equalIndex === -1 || equalIndex === o.length - 1) {
          this.log.error('invalid option:', o);
          hasInvalidProperty = true;
          return;
        }

        const key = o.substring(0, equalIndex);
        const value = o.substring(equalIndex + 1);

        this.pluginOptions[key] = value;
      });
    }

    if (hasInvalidProperty) {
      return;
    }

    return this.installer.runNPMInstallation({
      packageSpecifier: this.argv.package,
      cwd: this.env.cwd,
      env: process.env
    });
  }

  prompting () {
    const optionsMeta = this.installer.pluginManifest.options || {};
    const keys = Object.keys(optionsMeta);

    const previousPluginOptions = this.installer.existingPluginOptions;

    const commandLineOptionKeys =
      this.pluginOptions ? Object.keys(this.pluginOptions) : [];

    commandLineOptionKeys.forEach(key => {
      const schema = optionsMeta[key];
      if (!this._validateOption(key, this.pluginOptions[key], schema)) {
        this.log.error(`Invalid plugin option value for ${key}, ` +
          `expected: ${schema.type || 'string'}`);
      }
    });

    const pluginQuestions = keys
      .filter(key => {
        return commandLineOptionKeys.indexOf(key) === -1;
      })
      .map(key => {
        const schema = optionsMeta[key];
        return {
          type: 'input',
          name: `pluginOption${key}`,
          message: `Set value for ${key}:`,
          default: previousPluginOptions[key],
          validate: input => {
            return this._validateOption(key, input, schema);
          }
        };
      });

    const questions = pluginQuestions.slice(0);

    if (this.enablePlugin === null) {
      questions.push({
        type: 'confirm',
        name: 'enablePlugin',
        message: 'Would you like to enable this plugin in system config?'
      });
    }

    if (this.addPoliciesToWhitelist === null) {
      questions.push({
        type: 'confirm',
        name: 'addPoliciesToWhitelist',
        message: 'Would you like to add new policies to gateway config?'
      });
    }

    return this.prompt(questions)
      .then(answers => {
        this.enablePlugin = this.enablePlugin || answers.enablePlugin;
        this.addPoliciesToWhitelist =
        this.addPoliciesToWhitelist || answers.addPoliciesToWhitelist;

        if (pluginQuestions.length) {
          this.pluginOptions = this.pluginOptions || {};

          const keys = pluginQuestions.map(opt => opt.name);

          keys.forEach(key => {
            let answer = answers[key];
            const stripped = key.substr('pluginOption'.length);
            const optionMeta = optionsMeta[stripped];

            if (optionMeta && optionMeta.type && answer) {
              const type = optionMeta.type;
              if (type === 'number') {
                answer = Number(answer);
              } else if (type === 'boolean') {
                answer = Boolean(answer);
              }
            }

            this.pluginOptions[stripped] = answer;
          });
        }
      });
  }

  writing () {
    return this.installer.updateConfigurationFiles({
      pluginOptions: this.pluginOptions,
      enablePlugin: this.enablePlugin,
      addPoliciesToWhitelist: this.addPoliciesToWhitelist
    });
  }

  end () {
    this.stdout('Plugin installed!');
  }

  _validateOption (key, input, schema) {
    const type = schema.type;

    if (['string', 'boolean', 'number'].indexOf(type) === -1) {
      this.log.error(
        `Invalid plugin option: ${key}. Type must be string, boolean, ` +
        'or number.');

      return false;
    }

    if (schema.required && !input) {
      return false;
    }

    if (type === 'number' && isNaN(input)) {
      return false;
    }

    if (type === 'boolean' && !(input === 'true' || input === 'false')) {
      return false;
    }

    return true;
  }
};
