const Generator = require('yeoman-generator');

module.exports = class EgGenerator extends Generator {
  constructor (args, opts) {
    super(args, opts);
    this._configuration = null;
    this.commandAliases = [];
  }

  configureCommand (configuration) {
    configuration.handler = argv => {
      this.options.env.argv = argv;
      const command = this.options.env.commandAliases[0][argv._[0]];
      const subCommand = this.options.env.commandAliases[1][command][argv._[1]];
      this.options.env.run(`express-gateway:${command}:${subCommand}`);
    };

    this._configuration = configuration;
  }

  createSubCommand (name) {
    const generatorName = `${this.constructor.namespace}:${name}`;
    return this.options.env.create(generatorName)._configuration;
  }
};
