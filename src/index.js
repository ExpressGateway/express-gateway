'use strict';

let gateway = require('./gateway');

if (require.main === module) {
  let configPath;
  let appConfig = process.env.EG_APP_CONFIG;
  if (!appConfig) {
    configPath = process.env.EG_CONFIG_PATH || process.argv[2] || '/etc/express-gateway/config.yml'
  }
  gateway.start({
    configPath,
    appConfig
  });
}