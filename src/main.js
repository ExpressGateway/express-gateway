'use strict';

let loadConfig = require('./config.js');

if (require.main === module) {
  let [app, config] = loadConfig(process.argv[2] ||
                                 '/etc/lunchbadger/gateway.conf');
  if (!app || !config) {
    process.exit(1);
  }

  const bindPort = config.bindPort || 8080;
  const bindHost = config.bindHost || '127.0.0.1';

  app.listen(bindPort, bindHost, () => {
    console.log(`Listening on ${bindHost}:${bindPort}`);
  });
}
