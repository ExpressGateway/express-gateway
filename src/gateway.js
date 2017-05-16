'use strict';
const logger = require('./log').gateway
let configParser = require('./config-loader');

async function start(startupConfig) {
  let server, config;
  try {
    [server, config] = await configParser.loadConfig(startupConfig.configPath);
  } catch (err) {
    logger.error(err);
    logger.error('system is misconfigured, shutdown initiated %j', err)
    process.exit(1);
  }

  const bindPort = config.bindPort || startupConfig.defaultBindPort;

  const bindHost = config.bindHost || startupConfig.defaultBindHost;
  return new Promise((resolve) => {
    let runningApp = server.listen(bindPort, bindHost, () => {
      logger.info(`Listening on ${bindHost}:${bindPort}`);
      resolve({
        app: runningApp
      });
    });
  });
}

module.exports = {
  start
};