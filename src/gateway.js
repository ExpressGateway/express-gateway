'use strict';
const logger = require('./log').gateway
let configParser = require('./config-loader');

async function start(startupConfig) {
  let processedConfig;
  try {
    processedConfig = await configParser.loadConfig(startupConfig);
  } catch (err) {
    logger.error(err);
    logger.error('system is misconfigured, shutdown initiated %j', err)
    process.exit(1);
  }

  let httpPromise = new Promise((resolve) => {
    if (!processedConfig.config.http || !processedConfig.httpServer) {
      logger.info('HTTP server disabled (no http section provided in config)');
      return resolve(null);
    }
    let port = processedConfig.config.http.port
    let runningApp = processedConfig.httpServer.listen(port, () => {
      logger.info(`Listening on ${port}`);
      resolve({
        app: runningApp,
      });
    });
  });
  let httpsPromise = new Promise((resolve) => {
    if (!processedConfig.config.https || !processedConfig.httpsServer) {
      logger.info('HTTPS server disabled (no https section provided in config)');
      return resolve(null);
    }
    let port = processedConfig.config.https.port
    let runningApp = processedConfig.httpsServer.listen(port, () => {
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