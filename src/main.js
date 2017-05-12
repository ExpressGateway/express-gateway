'use strict';

let configParser = require('./config-loader');

if (require.main === module) {
  let server, config;
  try {
    [server, config] = configParser.loadConfig(process.argv[2] ||
      '/etc/lunchbadger/gateway.conf');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  const bindPort = config.bindPort || 8080;
  const bindHost = config.bindHost || '127.0.0.1';

  server.listen(bindPort, bindHost, () => {
    console.log(`Listening on ${bindHost}:${bindPort}`);
  });
}