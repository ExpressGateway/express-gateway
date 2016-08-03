'use strict';

let configParser = require('./config');

if (require.main === module) {
  let app = undefined;
  let config = undefined;
  try {
    [app, config] = configParser.loadConfig(process.argv[2] ||
                                            '/etc/lunchbadger/gateway.conf');
  } catch (err) {
    if (err instanceof configParser.MisconfigurationError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  const bindPort = config.bindPort || 8080;
  const bindHost = config.bindHost || '127.0.0.1';

  app.listen(bindPort, bindHost, () => {
    console.log(`Listening on ${bindHost}:${bindPort}`);
  });
}
