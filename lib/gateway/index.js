const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const Promise = require('bluebird');
const log = require('../log').gateway;
const serverLoader = require('./server');
const pipelineLoader = require('./pipelines');
let config = require('../config');
let oauth2 = require('../oauth2');

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
  let rootRouter;

  loadDependencies(app);

  rootRouter = pipelineLoader.bootstrap(express.Router());

  app.use((req, res, next) => {
    // rootRouter will process all requests;
    // after hot swap old instance will continue to serve previous requests
    // new instance will be serving new requests
    // once all old requests are served old instance is target for GC
    rootRouter(req, res, next);
  });

  config.emitter.on('gatewayConfigChange', () => {
    rootRouter = pipelineLoader.bootstrap(express.Router());
  });

  return serverLoader.bootstrap(app);
}

function loadDependencies (app) {
  app.use(bodyParser.json({ extended: true }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(session(config.systemConfig.session));
  app.use(passport.initialize());
  app.use(passport.session());

  oauth2(app);
}
