const Config = require('./config');
const log = require('../logger').config;

if (!process.env.EG_CONFIG_DIR) {
  process.env.EG_CONFIG_DIR = __dirname;
}

const config = new Config();

try {
  config.loadModels();
  config.loadSystemConfig();
  config.loadGatewayConfig();
} catch (err) {
  log.error(err);
  process.exit(1);
}

module.exports = config;
