const path = require('path');
const parentRequire = require('parent-require');
const eg = require('../../eg');
const PluginInstaller = require('../../../lib/plugin-installer');

module.exports = class extends eg.Generator {
  constructor (args, opts) {
    super(args, opts);

    this.installer = null;
    this.pluginOptions = null;

    this.configureCommand({
      command: 'configure <package>',
      description: 'Configure a plugin',
      builder: yargs =>
        yargs
          .usage(`Usage: $0 ${process.argv[2]} configure <package>`)
          .example(`$0 ${process.argv[2]} configure url-rewrite`)
    });
  }

  initializing () {
    this.packageName = this.argv.package;

    if (!this.packageName.startsWith(PluginInstaller.PACKAGE_PREFIX)) {
      try {
        const prefixedName = PluginInstaller.PACKAGE_PREFIX + this.packageName;
        this.pluginManifest = this._getPluginManifest(prefixedName);
        this.packageName = prefixedName;
      } catch (_) {
        // This will fall through to the next conditional statement.
      }
    }

    if (!this.pluginManifest) {
      try {
        this.pluginManifest = this._getPluginManifest(this.packageName);
      } catch (_) {
        this.log.error('Plugin not installed:', this.packageName);
        return;
      }
    }

    this.installer = PluginInstaller.create({
      packageName: this.packageName,
      pluginManifest: this.pluginManifest
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

    return this.prompt(pluginQuestions)
    .then(answers => {
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
    });
  }

  writing () {
    return this.installer.updateConfigurationFiles({
      pluginOptions: this.pluginOptions,
      enablePlugin: true,
      addPoliciesToWhitelist: false
    });
  }

  _getPluginManifest (packageName) {
    let pluginManifest;

    const pluginPath = path.join(this.env.cwd, 'node_modules', packageName);

    try {
      pluginManifest = require(pluginPath);
    } catch (_) {
      pluginManifest = parentRequire(pluginPath);
    }

    return pluginManifest;
  }

  end () {
    this.stdout('Plugin configured!');
  }
};
