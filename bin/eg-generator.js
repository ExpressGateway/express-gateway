const Generator = require('yeoman-generator');
const chalk = require('chalk');
const config = require('../lib/config');
const { validate, find } = require('../lib/schemas');

module.exports = class EgGenerator extends Generator {
  constructor (args, opts) {
    super(args, opts);

    this._configuration = null;
    this.eg = this.env.eg;
    this.argv = this.env.argv;
    this.admin = require('../admin')({
      baseUrl: this._getAdminClientBaseURL(),
      verbose: this._getAdminClientVerboseFlag(),
      headers: this.argv && this.argv.H ? this.processHeaders(this.argv.H) : null
    });
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
      .group(['no-color', 'q'], 'Options:');
  }

  _getAdminClientBaseURL () {
    const gatewayConfig = config.gatewayConfig;
    const systemConfig = config.systemConfig;

    let baseURL = 'http://localhost:9876'; // fallback default

    if (process.env.EG_ADMIN_URL) {
      baseURL = process.env.EG_ADMIN_URL;
    } else if (systemConfig && systemConfig.cli && systemConfig.cli.url) {
      baseURL = systemConfig.cli.url;
    } else if (gatewayConfig && gatewayConfig.admin) {
      const adminConfig = gatewayConfig.admin;
      const host = adminConfig.host || adminConfig.hostname || 'localhost';
      const port = adminConfig.port || 9876;

      baseURL = `http://${host}:${port}`;
    }

    /*
      This bad hack is required because of the weird way superagent is managing urls. Hopefully this is not
      going to be here forever — we'll replace the client with Axios hopefully.
      Ref: https://github.com/ExpressGateway/express-gateway/issues/672
    */

    if (baseURL.endsWith('/')) {
      baseURL = baseURL.substr(0, baseURL.length - 1);
    }

    return baseURL;
  }

  _getAdminClientVerboseFlag () {
    let verbose = false; // default

    if (this.argv && this.argv.v) {
      verbose = this.argv.v;
    } else if (config.systemConfig && config.systemConfig.cli) {
      verbose = !!config.systemConfig.cli.verbose;
    }

    return verbose;
  }

  processHeaders (headers) {
    const ArrayHeaders = Array.isArray(headers) ? headers : [headers];

    return ArrayHeaders.reduce((prev, header) => {
      const [headerName, headerValue] = header.split(/:(.+)/);

      if (headerValue) {
        prev[headerName] = headerValue;
      }

      return prev;
    }, {});
  }

  _promptAndValidate (object, schema, { skipPrompt = false } = {}) {
    let questions = [];

    if (!skipPrompt) {
      let shouldPrompt = false;
      const missingProperties = [];
      const modelSchema = find(schema).schema;

      Object.keys(modelSchema.properties).forEach(prop => {
        const descriptor = modelSchema.properties[prop];
        if (!object[prop]) {
          if (!shouldPrompt && modelSchema.required && modelSchema.required.includes(prop)) {
            shouldPrompt = true;
          }

          missingProperties.push({ name: prop, descriptor });
        }
      });

      if (shouldPrompt) {
        questions = missingProperties.map(p => {
          const required = modelSchema.required.includes(p.name)
            ? ' [required]'
            : '';

          return {
            name: p.name,
            message: `Enter ${chalk.yellow(p.name)}${chalk.green(required)}:`,
            default: object[p.name] || p.descriptor.default,
            validate: input => !modelSchema.required.includes(p.name) ||
              (!!input && modelSchema.required.includes(p.name)),
            filter: input => input === '' && !modelSchema.required.includes(p.name) ? undefined : input

          };
        });
      }
    }

    const validateData = data => {
      const { isValid, error } = validate(schema, data);
      if (!isValid) {
        this.log.error(error);
        if (!skipPrompt) {
          return this.prompt(questions).then(validateData);
        }
        throw new Error(error);
      }
      return data;
    };

    return this.prompt(questions).then((answers) => {
      Object.assign(object, answers);
      return validateData(object);
    });
  }
};
