require('util.promisify/shim')(); // NOTE: shim for native node 8.0 uril.promisify
const fs = require('fs');
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

const loadConfig = (configType) => {
  for (const ext of ['.yml', '.json']) {
    const configPath = path.format({
      dir: process.env.EG_CONFIG_DIR,
      name: configType,
      ext
    });

    try {
      return { configPath, content: yamlOrJson.load(fs.readFileSync(configPath)) };
    } catch (err) {
      log.error(`Failed to (re)load ${configPath}`);
      throw err;
    }
  }
};

class Config {
  constructor () {
    this.gatewayConfig = null;
    this.systemConfig = null;
    this.gatewayConfigPath = null;
    this.systemConfigPath = null;

    this.models = {};
  }

  loadSystemConfig () {
    const { configPath, content } = loadConfig('system.config');

    this.systemConfig = content;
    this.systemConfigPath = configPath;
    log.debug('systemConfigPath: ', this.systemConfigPath);
  }

  loadGatewayConfig () {
    const { configPath, content } = loadConfig('gateway.config');

    this.gatewayConfig = content;
    this.gatewayConfigPath = configPath;
    log.debug('gatewayConfigPath: ', this.gatewayConfigPath);
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

    this.watcher = chokidar.watch([this.systemConfigPath, this.gatewayConfigPath], watchOptions);

    watchEvents.forEach(watchEvent => {
      this.watcher.on(watchEvent, name => {
        log.info(`${watchEvent} event on ${name} file. Reloading config file.`);
        name === this.systemConfigPath ? this.loadSystemConfig() : this.loadGatewayConfig();
        eventBus.emit('hot-reload', { type: 'gateway', config: this });
      });
    });
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
