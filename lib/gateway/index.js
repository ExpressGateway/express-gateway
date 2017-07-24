const express = require('express');
const log = require('../logger').gateway;
const servers = require('./server');
const pipelines = require('./pipelines');
let config = require('../config');
let policies = require('../policies');

module.exports = function start () {
  let appPromises = [];
  let apps = {};

  let { httpServer, httpsServer } = bootstrap();

  if (config.gatewayConfig.http && httpServer) {
    appPromises.push(
      new Promise(resolve => {
        let runningApp = httpServer.listen(config.gatewayConfig.http.port, () => {
          const { address, port } = runningApp.address();

          // eslint-disable-next-line no-console
          console.log(`gateway http server listening on ${address}:${port}`);

          apps.httpApp = runningApp;
          resolve();
        });
      })
    );
  }

  if (config.gatewayConfig.https && httpsServer) {
    appPromises.push(
      new Promise(resolve => {
        let runningApp = httpsServer.listen(config.gatewayConfig.https.port, () => {
          const { address, port } = runningApp.address();

          // eslint-disable-next-line no-console
          console.log(`gateway https server listening on ${address}:${port}`);

          apps.httpsApp = runningApp;
          resolve();
        });
      })
    );
  }

  return Promise.all(appPromises)
    .then(() => {
      return {
        app: apps.httpApp,
        httpsApp: apps.httpsApp
      };
    });
};

function bootstrap () {
  let app = express();

  let rootRouter;
  // Load all routes from policies
  config.gatewayConfig.policies && config.gatewayConfig.policies.forEach(policy => {
    if (policies[policy].routes) policies[policy].routes(app, config);
  });

  const serverInstances = servers.bootstrap(app);
  rootRouter = pipelines.bootstrap(express.Router(), serverInstances);

  app.use((req, res, next) => {
    // rootRouter will process all requests;
    // after hot swap old instance will continue to serve previous requests
    // new instance will be serving new requests
    // once all old requests are served old instance is target for GC
    rootRouter(req, res, next);
  });

  config.on('gatewayConfigChange', () => {
    const oldRootRouter = rootRouter;
    try {
      rootRouter = pipelines.bootstrap(express.Router());
    } catch (err) {
      log.error('Could not hot-reload gateway.config.yml. Configuration is invalid.', err);
      rootRouter = oldRootRouter;
    }
  });

  if (!process.env.EG_DISABLE_CONFIG_WATCH) {
    config.watch();
  }

  return serverInstances;
}
