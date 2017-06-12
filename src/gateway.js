'use strict';
const logger = require('./log').gateway
let config = require('./config-loader');

async function start(startupConfig) {
  let servers;
  try {
    await config.loadConfig(startupConfig)
    servers = config.bootstrapGateway();
  } catch (err) {
    logger.error(err);
    logger.error('system is misconfigured, shutdown initiated %j', err)
    process.exit(1);
  }
  let gatewayConfig = config.getGatewayConfig()
  let httpPromise = new Promise((resolve) => {
    if (!gatewayConfig.http || !servers.httpServer) {
      logger.info('HTTP server disabled (no http section provided in config)');
      return resolve(null);
    }
    let port = gatewayConfig.http.port
    let runningApp = servers.httpServer.listen(port, () => {
      logger.info(`Listening on ${port}`);
      resolve({
        app: runningApp,
      });
    });
  });
  let httpsPromise = new Promise((resolve) => {
    if (!gatewayConfig.https || !servers.httpsServer) {
      logger.info('HTTPS server disabled (no https section provided in config)');
      return resolve(null);
    }
    let port = gatewayConfig.https.port
    let runningApp = servers.httpsServer.listen(port, () => {
      logger.info(`Listening on ${port}`);
      resolve({
        app: runningApp,
      });
    });
  });
  return Promise.all([httpPromise, httpsPromise]).then(servers => {
    let app = servers[0] && servers[0].app;
    let httpsApp = servers[1] && servers[1].app;
    return {
      app,
      httpsApp
    }
  })
}

module.exports = {
  start
};
