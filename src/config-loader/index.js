const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');

const serverLoader = require('./server-loader');
const fileLoader = require('./file-loader');
const pipelineLoader = require('./pipelines-loader');
const fs = require('fs');
let logger = require('../log').config;
let gatewayConfig = {};
let systemConfig = {};
let rootRouter;
  /// expecting gatewayConfigPath if loading from file
  /// if config was provided as code or env var use gatewayConfig
function loadConfig (startupConfig) {
  let gatewayConfigFileName = startupConfig.gatewayConfigPath;
  if (gatewayConfigFileName) {
    gatewayConfig = fileLoader.readConfigFile(gatewayConfigFileName);
    logger.debug('loaded gatewayConfig from file %s %j', gatewayConfigFileName, gatewayConfig);
  } else {
    gatewayConfig = startupConfig.gatewayConfig;
    logger.debug('loaded gatewayConfig from code %j', gatewayConfig);
  }

  let systemConfigFileName = startupConfig.systemConfigPath;
  if (systemConfigFileName) {
    systemConfig = fileLoader.readConfigFile(systemConfigFileName);
    logger.debug('loaded systemConfig from file %s %j', systemConfigFileName, systemConfig);
  } else {
    systemConfig = startupConfig.systemConfig;
    logger.debug('loaded systemConfig from code %j', systemConfig);
  }

  if (gatewayConfigFileName) {
    // hot reload only if config provided by file and for gateway config only
    fs.watch(gatewayConfigFileName, (evt, name) => {
      logger.info(`watch file triggered ${evt} file ${name}
      note: loading file ${gatewayConfigFileName}`);
      let config = fileLoader.readConfigFile(gatewayConfigFileName);
      // hot swap router
      rootRouter = pipelineLoader.bootstrap(express.Router(), config);
    });
  }
}

function bootstrapGateway () {
  let app = express();

  loadDependencies(app);

  rootRouter = pipelineLoader.bootstrap(express.Router(), gatewayConfig);

  app.use((req, res, next) => {
    // rootRouter will process all requests;
    // after hot swap old instance will continue to serve previous requests
    // new instance will be serving new requests
    // once all old requests are served old instance is target for GC
    rootRouter(req, res, next);
  });

  let servers = serverLoader.bootstrap(app, gatewayConfig);
  return { httpsServer: servers.httpsServer, httpServer: servers.httpServer };
}

function loadDependencies (app) {
  app.use(bodyParser.json({ extended: true }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  // TODO: add session options to config file
  app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
  app.use(passport.initialize());
  app.use(passport.session());
}

module.exports = {
  loadConfig,
  bootstrapGateway,

  // NOTE: it may be needed in furture to allow argument to select some part not entire config
  // example "https.port" to not pollute code with if`s like if(https && https.port)
  getGatewayConfig: () => gatewayConfig,
  getSystemConfig: () => systemConfig
};
