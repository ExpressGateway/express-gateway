const Config = require('./config');
const log = require('../logger').config;

if (!process.env.EG_CONFIG_DIR) {
  process.env.EG_CONFIG_DIR = __dirname;
}

const config = new Config();

try {
  config.loadModels();
  ['system', 'gateway'].forEach(type => config.loadConfig(type));
} catch (err) {
  log.error(err);
  throw err;
}

module.exports = config;
