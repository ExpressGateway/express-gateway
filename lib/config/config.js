const fs = require('fs');
const chalk = require('chalk');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const path = require('path');
const log = require('../logger').config;
const chokidar = require('chokidar');
const yamlOrJson = require('js-yaml');
const eventBus = require('../eventBus');
const schemas = require('../schemas');

class Config {
  constructor() {
    this.models = {};

    this.configTypes = {
      system: {
        baseFilename: 'system.config',
        validator: schemas.register('config', 'system.config', require('./schemas/system.config.json')),
        pathProperty: 'systemConfigPath',
        configProperty: 'systemConfig'
      },
      gateway: {
        baseFilename: 'gateway.config',
        validator: schemas.register('config', 'gateway.config', require('./schemas/gateway.config.json')),
        pathProperty: 'gatewayConfigPath',
        configProperty: 'gatewayConfig'
      }
    };
  }

  loadConfig(type) {
    const configType = this.configTypes[type];
    let configPath = this[configType.pathProperty] || path.join(process.env.EG_CONFIG_DIR, `${configType.baseFilename}.yml`);
    let config;

    try {
      fs.accessSync(configPath, fs.constants.R_OK);
    } catch (e) {
      log.verbose(`Unable to access ${configPath} file. Trying with the json counterpart.`);
      configPath = path.join(process.env.EG_CONFIG_DIR, `${configType.baseFilename}.json`);
    }

    try {
      config = yamlOrJson.load(envReplace(fs.readFileSync(configPath, 'utf8'), process.env));
    } catch (err) {
      log.error(`failed to (re)load ${type} config: ${err}`);
      throw (err);
    }

    const { isValid, error } = configType.validator(config);

    if (!isValid) {
      throw new Error(error);
    }

    this[configType.pathProperty] = configPath;
    this[configType.configProperty] = config;
    log.debug(`ConfigPath: ${configPath}`);
  }

  loadGatewayConfig() { this.loadConfig('gateway'); }

  loadModels() {
    ['users.json', 'credentials.json', 'applications.json'].forEach(model => {
      const module = path.resolve(process.env.EG_CONFIG_DIR, 'models', model);
      const name = path.basename(module, '.json');
      this.models[name] = require(module);
      schemas.register('model', name, this.models[name]);
      log.verbose(`Registered schema for ${chalk.green(name)} model.`);
    });
  }

  watch() {
    if (typeof this.systemConfigPath !== 'string' || typeof this.gatewayConfigPath !== 'string') { return; }

    const watchEvents = ['add', 'change'];

    const watchOptions = {
      awaitWriteFinish: true,
      ignoreInitial: true
    };

    this.watcher = chokidar.watch([this.systemConfigPath, this.gatewayConfigPath], watchOptions);

    watchEvents.forEach(watchEvent => {
      this.watcher.on(watchEvent, name => {
        const type = name === this.systemConfigPath ? 'system' : 'gateway';
        log.info(`${watchEvent} event on ${name} file. Reloading ${type} config file`);

        try {
          this.loadConfig(type);
          eventBus.emit('hot-reload', { type, config: this });
        } catch (e) {
          log.debug(`Failed hot reload of system config: ${e}`);
        }
      });
    });
  }

  unwatch() {
    this.watcher && this.watcher.close();
  }

  updateGatewayConfig(modifier) {
    return this._updateConfigFile('gateway', modifier);
  }

  _updateConfigFile(type, modifier) {
    const configType = this.configTypes[type];
    const path = this[configType.pathProperty];

    return readFile(path, 'utf8').then(data => {
      const json = yamlOrJson.load(data);
      const result = modifier(json);
      const text = yamlOrJson.dump(result);
      const candidateConfiguration = yamlOrJson.load(envReplace(String(text), process.env));

      const { isValid, error } = configType.validator(candidateConfiguration);

      if (!isValid) {
        const e = new Error(error);
        e.code = 'INVALID_CONFIG';
        throw e;
      }

      try {
        /*
          This is really bad. It means we have circular dependencies that's a code smell, no matter what. This needs
          to be refactored as soon as possible.
        */
        const { policies } = require('../policies');
        for (const pipelineName in candidateConfiguration.pipelines) {
          const pipeline = candidateConfiguration.pipelines[pipelineName];

          pipeline.policies.forEach(policy => {
            const policyName = Object.keys(policy)[0];
            const policyDefinition = policies[policyName];

            let policySteps = policy[policyName];

            if (!policySteps) {
              policySteps = [];
            } else if (!Array.isArray(policySteps)) {
              policySteps = [policySteps];
            }

            for (const step of policySteps) {
              const { isValid, error } = schemas.validate(policyDefinition.schema.$id, step.action || {});
              if (!isValid) {
                throw new Error(error);
              }
            }
          });
        }

        return writeFile(path, text);
      } catch (err) {
        log.error(`Invalid pipelines configuration: ${err}`);
        err.code = 'INVALID_CONFIG';

        throw err;
      }
    });
  }
}

// Kindly borrowed from https://github.com/macbre/optimist-config-file/blob/master/lib/envvar-replace.js
// Thanks a lot guys 🙌

function envReplace(str, vars) {
  return str.replace(/\$?\$\{([A-Za-z0-9_]+)(:-(.*?))?\}/g, function (varStr, varName, _, defValue) {
    // Handle escaping:
    if (varStr.indexOf('$$') === 0) {
      return varStr;
    }
    // Handle simple variable replacement:
    if (vars.hasOwnProperty(varName)) {
      log.debug(`${varName} replaced in configuration file`);
      return vars[varName];
    }
    // Handle default values:
    if (defValue) {
      log.debug(`${varName} replaced with default value in configuration file`);
      return defValue;
    }
    log.warn(`Unknown variable: ${varName}. Returning null.`);
    return null;
  });
};

module.exports = Config;
