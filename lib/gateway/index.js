const express = require('express');
const chalk = require('chalk');
const log = require('../logger').gateway;
const servers = require('./server');
const pipelines = require('./pipelines');
const eventBus = require('../eventBus');
const policies = require('../policies');
const conditions = require('../conditions');
const passport = require('passport');
const pluginsLoader = require('../plugins');

module.exports = function ({ plugins, config } = {}) {
  const appPromises = [];
  const apps = {};
  config = config || require('../config');
  return bootstrap({ plugins, config }).then(({ httpServer, httpsServer }) => {
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
  });
};

const bootstrapPolicies = ({ app, plugins, config } = {}) => {
  if (plugins && plugins.policies && plugins.policies.length) {
    plugins.policies.forEach(policy => {
      if (!policies[policy.name]) {
        log.verbose(`registering policy ${chalk.green(policy.name)} from ${plugins.name} plugin`);
        policies.register(policy);
      } else log.verbose(`policy ${chalk.magenta(policy.name)} from ${plugins.name} is already loaded`);
    });
  }

  // Load policies present in config
  policies.load(config.gatewayConfig.policies);

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
      log.debug(`registering condition ${cond.name}`);
      conditionEngine.register(cond);
    });
  }
};

async function bootstrap({ plugins, config } = {}) {
  let rootRouter;
  const app = express();
  app.set('x-powered-by', false);
  app.use(passport.initialize());
  bootstrapPolicies({ app, plugins, config });
  rootRouter = await pipelines.bootstrap({ app: express.Router(), config });
  app.use((req, res, next) => rootRouter(req, res, next));

  eventBus.on('hot-reload', async (hotReloadContext) => {
    const oldConfig = config;
    const oldPlugins = plugins;
    const oldRootRouter = rootRouter;
    try {
      const newConfig = hotReloadContext.config;
      bootstrapPolicies({ app, plugins: pluginsLoader.load(newConfig), config: newConfig });
      rootRouter = await pipelines.bootstrap({ app: express.Router(), config: newConfig });
      log.info('hot-reload config completed');
    } catch (err) {
      log.error(`Could not hot-reload gateway.config.yml. Configuration is invalid. ${err}`);
      bootstrapPolicies({ app, plugins: oldPlugins, config: oldConfig });
      rootRouter = oldRootRouter;
    }
  });

  if (!process.env.EG_DISABLE_CONFIG_WATCH) {
    config.watch();
  }

  return servers.bootstrap(app);
}
