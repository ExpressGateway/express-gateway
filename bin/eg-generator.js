const Generator = require('yeoman-generator');
const config = require('../lib/config');

module.exports = class EgGenerator extends Generator {
  constructor (args, opts) {
    super(args, opts);

    this._configuration = null;
    this.eg = this.env.eg;
    this.argv = this.env.argv;
    if (this.argv) {
      let cliConfig = config.systemConfig.cli || {};
      this.admin = require('../lib/admin')({
        cliConfig,
        headers: this.argv.H,
        verbose: this.argv.v || cliConfig.verbose
      });
    }
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

  stdout (...args) {
    // eslint-disable-next-line no-console
    console.log.apply(console, args);
  }

  createSubCommand (name) {
    const generatorName = `${this.constructor.namespace}:${name}`;
    return this.env.create(generatorName)._configuration;
  }

  // configuration defaults
  _wrapConfig (yargs) {
    return yargs
      .boolean(['no-color', 'q', 'v'])
      .string(['H'])
      .describe('no-color', 'Disable color in prompts')
      .alias('q', 'quiet')
      .describe('q', 'Only show major pieces of output')
      .describe('H', 'Header to send with each request to Express Gateway Admin API KEY:VALUE format')
      .alias('v', 'verbose')
      .describe('v', 'Verbose output, will show request to Admin API')
      .group(['no-color', 'q'], 'Options:')
      .help('h');
  }
};
