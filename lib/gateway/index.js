const express = require('express');
const log = require('../logger').gateway;
const servers = require('./server');
const pipelines = require('./pipelines');
const eventBus = require('../eventBus');
const policies = require('../policies');
const conditions = require('../conditions');
const passport = require('passport');

module.exports = function ({ plugins, config } = {}) {
  const appPromises = [];
  const apps = {};
  if (plugins && plugins.policies && plugins.policies.length) {
    plugins.policies.forEach(p => {
      log.debug('registering policy', p.name);
      policies.register(p);
    });
  }
  config = config || require('../config');
  const { httpServer, httpsServer } = bootstrap({ plugins, config });

  [
    { serverConfig: config.gatewayConfig.http, server: httpServer, appProperty: 'httpApp', eventName: 'http-ready' },
    { serverConfig: config.gatewayConfig.https, server: httpsServer, appProperty: 'httpsApp', eventName: 'https-ready' }
  ].forEach(({ serverConfig, server, appProperty, eventName }) => {
    if (serverConfig && server) {
      appPromises.push(new Promise(resolve => {
        const runningApp = server.listen(serverConfig.port, serverConfig.hostname, () => {
          const addressInfo = runningApp.address();
          const adInfo = typeof addressInfo === 'string' ? addressInfo : `${addressInfo.address}:${addressInfo.port}`;
          log.info(`gateway ${appProperty.startsWith('https') ? 'https' : 'http'} server listening on ${adInfo}`);

          eventBus.emit(eventName, { httpServer: runningApp });

          apps[appProperty] = runningApp;
          resolve(runningApp);
        });
      })
      );
    }
  });

  return Promise.all(appPromises)
    .then(() => {
      return {
        app: apps.httpApp,
        httpsApp: apps.httpsApp
      };
    });
};

function bootstrap ({ plugins, config } = {}) {
  const app = express();
  app.set('x-powered-by', false);

  let rootRouter;
  // Load all routes from policies
  // TODO: after all complext policies will go to plugin this code can be removed
  // NOTE: plugins have mechanism to provide custom routes
  config.gatewayConfig.policies && config.gatewayConfig.policies.forEach(policyName => {
    const policy = policies.resolve(policyName);
    if (policy.routes) {
      policy.routes(app, config);
    }
  });

  if (plugins && plugins.gatewayRoutes && plugins.gatewayRoutes.length) {
    log.debug('registering gatewayRoute');
    plugins.gatewayRoutes.forEach(ext => ext(app));
  }

  const conditionEngine = conditions.init();
  if (plugins && plugins.conditions && plugins.conditions.length) {
    plugins.conditions.forEach(cond => {
      log.debug('registering condition', cond.name);
      conditionEngine.register(cond);
    });
  }
  app.use(passport.initialize());
  rootRouter = pipelines.bootstrap({ app: express.Router(), config });
  app.use((req, res, next) => {
    // rootRouter will process all requests;
    // after hot swap old instance will continue to serve previous requests
    // new instance will be serving new requests
    // once all old requests are served old instance is target for GC
    rootRouter(req, res, next);
  });

  eventBus.on('hot-reload', (hotReloadContext) => {
    const oldRootRouter = rootRouter;
    try {
      rootRouter = pipelines.bootstrap({ app: express.Router(), config: hotReloadContext.config });
      log.info('hot-reload router completed');
    } catch (err) {
      log.error('Could not hot-reload gateway.config.yml. Configuration is invalid.', err);
      rootRouter = oldRootRouter;
    }
  });

  if (!process.env.EG_DISABLE_CONFIG_WATCH) {
    config.watch();
  }

  return servers.bootstrap(app);
}
