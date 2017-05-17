'use strict';
const logger = require('./log').gateway
let configParser = require('./config-loader');

async function start(startupConfig) {
  let server, config;
  try {
    [server, config] = await configParser.loadConfig(startupConfig);
  } catch (err) {
    logger.error(err);
    logger.error('system is misconfigured, shutdown initiated %j', err)
    process.exit(1);
  }

  //TODO: as part of #13 start 2 servers with proper section
  const bindPort = (config.https && config.https.port) ||
    (config.http && config.http.port) || 8080

  return new Promise((resolve) => {
    let runningApp = server.listen(bindPort, () => {
      logger.info(`Listening on ${bindPort}`);
      resolve({
        app: runningApp
      });
    });
  });
}

module.exports = {
  start
};