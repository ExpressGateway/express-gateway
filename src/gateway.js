'use strict';
const logger = require('./log').gateway
let configParser = require('./config');

async function start(startupConfig) {
  let server = undefined;
  let config = undefined;
  try {
    [server, config] = await configParser.loadConfig(startupConfig.configPath);
  } catch (err) {
    logger.error(err);
    if (err instanceof configParser.ConfigurationError) {
      logger.error('system is misconfigured, shutdown initiated %j', err)
    }
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