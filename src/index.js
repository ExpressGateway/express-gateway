'use strict';

let gateway = require('./gateway');

if (require.main === module) {
  let gatewayConfigPath;
  let gatewayConfig = process.env.EG_GATEWAY_CONFIG;
  if (!gatewayConfig) {
    gatewayConfigPath = process.env.EG_GATEWAY_CONFIG_PATH || process.argv[2] || require('os').homedir() + '/.express-gateway/gateway.config.yml';
  }
  gateway.start({
    gatewayConfigPath,
    gatewayConfig
  });
}
