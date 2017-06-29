const Generator = require('yeoman-generator');

module.exports = class EgGenerator extends Generator {
  constructor (args, opts) {
    super(args, opts);

    this._configuration = null;
    this.eg = this.env.eg;
    this.argv = this.env.argv;
  }

  configureCommand (configuration) {
    const builder = configuration.builder;
    configuration.builder = yargs => {
      return this._wrapConfig(builder(yargs));
    };

    configuration.handler = argv => {
      this.env.argv = argv;

      const command = this.options.env.commandAliases[0][argv._[0]];
      const subCommand = this.options.env.commandAliases[1][command][argv._[1]];

      this.env.run(`express-gateway:${command}:${subCommand}`);
    };

    this._configuration = configuration;
  }

  createSubCommand (name) {
    const generatorName = `${this.constructor.namespace}:${name}`;
    return this.env.create(generatorName)._configuration;
  }

  // configuration defaults
  _wrapConfig (yargs) {
    return yargs
      .string('config-dir')
      .describe('config-dir', 'Directory for express-gateway configuration')
      .nargs('config-dir', 1)
      .group(['config-dir'], 'Configure:')
      .help('h');
  }
};
