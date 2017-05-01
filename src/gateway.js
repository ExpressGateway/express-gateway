'use strict';
const debug = require('debug')('EG:gateway')
let configParser = require('./config');

async function start(startupConfig) {
  let server = undefined;
  let config = undefined;
  try {
    [server, config] = await configParser.loadConfig(startupConfig.configPath);
  } catch (err) {
    debug("FATAL:" + err.message);
    if (err instanceof configParser.MisconfigurationError) {
      process.exit(1);
    }
    throw err;
  }

  const bindPort = config.bindPort || startupConfig.defaultBindPort;

  const bindHost = config.bindHost || startupConfig.defaultBindHost;
  return new Promise((resolve) => {
    let runningApp = server.listen(bindPort, bindHost, () => {
      debug(`Listening on ${bindHost}:${bindPort}`);
      resolve({
        app: runningApp
      });
    });
  });
}

module.exports = {
  start
};