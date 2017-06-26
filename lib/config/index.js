const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yamlOrJson = require('js-yaml');
const EventEmitter = require('events');
const log = require('../log').config;
let config;

if (!process.env.EG_CONFIG_DIR) {
  process.env.EG_CONFIG_DIR = __dirname;
}

function Config () {}

Config.prototype.loadSystemConfig = function () {
  let systemConfigPath;
  try {
    systemConfigPath = path.join(process.env.EG_CONFIG_DIR, 'system.config.yml');
    this.systemConfig = yamlOrJson.load(fs.readFileSync(systemConfigPath));
    this.systemConfigPath = systemConfigPath;
  } catch (err) {
    try {
      systemConfigPath = path.join(process.env.EG_CONFIG_DIR, 'system.config.json');
      this.systemConfig = yamlOrJson.load(fs.readFileSync(systemConfigPath));
      this.systemConfigPath = systemConfigPath;
    } catch (err) {
      log.error(`failed to (re)load system config: ${err}`);
      throw (err);
    }
  }
};

Config.prototype.loadGatewayConfig = function () {
  let gatewayConfigPath;

  try {
    gatewayConfigPath = path.join(process.env.EG_CONFIG_DIR, 'gateway.config.yml');
    this.gatewayConfig = yamlOrJson.load(fs.readFileSync(gatewayConfigPath));
    this.gatewayConfigPath = gatewayConfigPath;
  } catch (err) {
    try {
      gatewayConfigPath = path.join(process.env.EG_CONFIG_DIR, 'gateway.config.json');
      this.gatewayConfig = yamlOrJson.load(fs.readFileSync(gatewayConfigPath));
      this.gatewayConfigPath = gatewayConfigPath;
    } catch (err) {
      log.error(`failed to (re)load gateway config: ${err}`);
      throw (err);
    }
  }
};

Config.prototype.loadModels = function () {
  this.models = {};
  glob.sync(path.resolve(process.env.EG_CONFIG_DIR, 'models', '*.js')).forEach(module => {
    let name = path.basename(module).split('.')[0];
    this.models[name] = require(module);
  });
};

config = new Config();

try {
  config.loadSystemConfig();
  config.loadGatewayConfig();
  config.loadModels();
} catch (err) {
  log.error(err);
  process.exit(1);
}

config.emitter = new EventEmitter();

fs.watch(config.systemConfigPath, (evt, name) => {
  if (evt !== 'change') {
    return;
  }

  log.info(`${evt} event on ${name} file. Reloading system config file from ${config.systemConfigPath}`);
  config.loadSystemConfig();
  config.emitter.emit('systemConfigChange');
});

fs.watch(config.gatewayConfigPath, (evt, name) => {
  if (evt !== 'change') {
    return;
  }

  log.info(`${evt} event on ${name} file. Reloading gateway config file from ${config.gatewayConfigPath}`);
  config.loadGatewayConfig();
  config.emitter.emit('gatewayConfigChange');
});

module.exports = config;
