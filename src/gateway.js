'use strict';

let configParser = require('./config');

function start(startupConfig) {
  let server = undefined;
  let config = undefined;
  try {
    [server, config] = configParser.loadConfig(startupConfig.configPath);
  } catch (err) {
    if (err instanceof configParser.MisconfigurationError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  const bindPort = config.bindPort || startupConfig.defaultBindPort;
  const bindHost = config.bindHost || startupConfig.defaultBindHost;
  return new Promise((resolve) => {
    let runningApp = server.listen(bindPort, bindHost, () => {
      console.log(`Listening on ${bindHost}:${bindPort}`);
      resolve({
        app: runningApp
      });
    });
  });
}

module.exports = {
  start
};