const fs = require('fs');
require('util.promisify/shim')(); // NOTE: shim for native node 8.0 uril.promisify
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const YAWN = require('yawn-yaml/cjs');
const path = require('path');
const log = require('../logger').config;
const chokidar = require('chokidar');
const glob = require('glob');
const yamlOrJson = require('js-yaml');
const eventBus = require('../eventBus');
class Config {
  constructor () {
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
    let systemConfigPath = this.systemConfigPath || path.join(process.env.EG_CONFIG_DIR, 'system.config.yml');
    try {
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
    log.debug('systemConfigPath: ', systemConfigPath);
  }

  loadGatewayConfig () {
    let gatewayConfigPath = this.gatewayConfigPath || path.join(process.env.EG_CONFIG_DIR, 'gateway.config.yml');

    try {
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
    log.debug('gatewayConfigPath: ', gatewayConfigPath);
  }

  loadModels () {
    glob.sync(path.resolve(process.env.EG_CONFIG_DIR, 'models', '*.js')).forEach(module => {
      const name = path.basename(module).split('.')[0];
      this.models[name] = require(module);
    });
  }

  watch () {
    const watchEvents = ['add', 'change'];

    const watchOptions = {
      awaitWriteFinish: true,
      ignoreInitial: true
    };

    const systemWatcher = chokidar.watch(this.systemConfigPath, watchOptions);
    const gatewayWatcher = chokidar.watch(this.gatewayConfigPath, watchOptions);

    watchEvents.forEach(watchEvent => {
      systemWatcher.on(watchEvent, name => {
        log.info(`${watchEvent} event on ${name} file. Reloading system config ` +
          `file from ${this.systemConfigPath}`);
        this.loadSystemConfig();
        eventBus.emit('hot-reload', { type: 'system', config: this });
      });

      gatewayWatcher.on(watchEvent, name => {
        log.info(`${watchEvent} event on ${name} file. Reloading gateway config ` +
          `file from ${this.gatewayConfigPath}`);
        this.loadGatewayConfig();
        eventBus.emit('hot-reload', { type: 'gateway', config: this });
      });
    });

    this.watchers.system = systemWatcher;
    this.watchers.gateway = gatewayWatcher;
  }

  updateGatewayConfig (modifier) {
    return this._updateConfigFile(this.gatewayConfigPath, modifier);
  }
  updateSystemConfig (modifier) {
    return this._updateConfigFile(this.systemConfigPath, modifier);
  }

  // this function can preserve comments and formatting.
  // due to fragile nature of YAWN it may not work properly in that mode.
  // safe way is to use it in rewrite file mode
  _updateConfigFile (path, modifier) {
    return readFile(path, 'utf8').then(data => {
      let text;
      const isJSON = path.toLowerCase().endsWith('.json');
      if (this.systemConfig && this.systemConfig.preserveStructureOnUpdates && !isJSON) {
        const yawn = new YAWN(data);
        yawn.json = modifier(yawn.json);
        text = yawn.yaml;
      } else { // js-yaml can handle JSON as well as YAML if no need for structure\comments save
        const json = yamlOrJson.load(data);
        const result = modifier(json);
        text = yamlOrJson.dump(result);
      }
      return writeFile(path, text);
    });
  }
}

module.exports = Config;
