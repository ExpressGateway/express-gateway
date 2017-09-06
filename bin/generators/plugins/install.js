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
    });
  }

  initializing () {
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

    const pluginQuestions = keys.map(key => {
      const schema = optionsMeta[key];
      return {
        type: 'input',
        name: `pluginOption${key}`,
        message: `Set value for ${key}:`,
        default: previousPluginOptions[key],
        validate: input => {
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
    });

    return this.prompt(pluginQuestions.concat([
      {
        type: 'confirm',
        name: 'enablePlugin',
        message: 'Would you like to enable this plugin in system config?'
      },
      {
        type: 'confirm',
        name: 'addPoliciesToWhitelist',
        message: 'Would you like to add new policies to gateway config?'
      }
    ]))
    .then(answers => {
      this.enablePlugin = answers.enablePlugin;
      this.addPoliciesToWhitelist = answers.addPoliciesToWhitelist;

      if (pluginQuestions.length) {
        this.pluginOptions = {};

        const keys = pluginQuestions.map(opt => opt.name);
        const self = this;
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

          self.pluginOptions[stripped] = answer;
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
};
