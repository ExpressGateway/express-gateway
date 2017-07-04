const express = require('express');
const bodyParser = require('body-parser');
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
          log.info(`http server listening on ${config.gatewayConfig.http.port}`);
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
          log.info(`https server listening on ${config.gatewayConfig.https.port}`);
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
  app.use(bodyParser.json({ extended: true }));
  app.use(bodyParser.urlencoded({ extended: true }));

  let rootRouter;
  // Load all routes from policies
  config.gatewayConfig.policies && config.gatewayConfig.policies.forEach(policy => {
    if (policies[policy].routes) policies[policy].routes(app, config);
  });

  rootRouter = pipelines.bootstrap(express.Router());

  app.use((req, res, next) => {
    // rootRouter will process all requests;
    // after hot swap old instance will continue to serve previous requests
    // new instance will be serving new requests
    // once all old requests are served old instance is target for GC
    rootRouter(req, res, next);
  });

  config.emitter.on('gatewayConfigChange', () => {
    rootRouter = pipelines.bootstrap(express.Router());
  });

  return servers.bootstrap(app);
}
