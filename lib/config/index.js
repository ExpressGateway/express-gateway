const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const chokidar = require('chokidar');
const glob = require('glob');
const yamlOrJson = require('js-yaml');

const log = require('../logger').config;

class Config extends EventEmitter {
  constructor () {
    super();

    this.gatewayConfig = null;
    this.systemConfig = null;

    this.gatewayConfigPath = null;
    this.systemConfigPath = null;

    this.models = {};

    this.watchers = {
      system: null,
      gateway: null
    };
  }

  loadSystemConfig () {
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
  }

  loadGatewayConfig () {
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
  }

  loadModels () {
    glob.sync(path.resolve(process.env.EG_CONFIG_DIR, 'models', '*.js')).forEach(module => {
      let name = path.basename(module).split('.')[0];
      this.models[name] = require(module);
    });
  }

  watch () {
    const watchEvents = ['add', 'change'];

    const watchOptions = {
      awaitWriteFinish: true
    };

    const systemWatcher = chokidar.watch(this.systemConfigPath, watchOptions);
    const gatewayWatcher = chokidar.watch(this.gatewayConfigPath, watchOptions);

    watchEvents.forEach(watchEvent => {
      systemWatcher.on(watchEvent, name => {
        log.info(`${watchEvent} event on ${name} file. Reloading system config ` +
          `file from ${this.systemConfigPath}`);
        this.loadSystemConfig();
        this.emit('systemConfigChange');
      });

      gatewayWatcher.on(watchEvent, name => {
        log.info(`${watchEvent} event on ${name} file. Reloading gateway config ` +
          `file from ${this.gatewayConfigPath}`);
        this.loadGatewayConfig();
        this.emit('gatewayConfigChange');
      });
    });

    this.watchers.system = systemWatcher;
    this.watchers.gateway = gatewayWatcher;

    systemWatcher.on('ready', () => {
      systemWatcher.isReady = true;
    });

    gatewayWatcher.on('ready', () => {
      gatewayWatcher.isReady = true;
    });
  }
}

if (!process.env.EG_CONFIG_DIR) {
  process.env.EG_CONFIG_DIR = __dirname;
}

const config = new Config();

try {
  config.loadSystemConfig();
  config.loadGatewayConfig();
  config.loadModels();
} catch (err) {
  log.error(err);
  process.exit(1);
}

module.exports = config;
