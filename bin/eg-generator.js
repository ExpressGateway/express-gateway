const Generator = require('yeoman-generator');
const config = require('../lib/config');

Generator.prototype.stdout = function () {
  // eslint-disable-next-line no-console
  console.log.apply(arguments);
};
module.exports = class EgGenerator extends Generator {
  constructor (args, opts) {
    super(args, opts);

    this._configuration = null;
    this.eg = this.env.eg;
    this.argv = this.env.argv;
    this.admin = require('../lib/admin')(config.gatewayConfig.admin);
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
      .boolean(['no-color', 'q'])
      .describe('no-color', 'Disable color in prompts')
      .string('config-dir')
      .describe('config-dir', 'Directory for express-gateway configuration')
      .nargs('config-dir', 1)
      .describe('q', 'Only show major pieces of output')
      .group(['config-dir'], 'Configure:')
      .group(['no-color', 'q'], 'Options:')
      .alias('q', 'quiet')
      .help('h');
  }
};
