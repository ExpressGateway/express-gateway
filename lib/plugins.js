const logger = require('./logger').plugins;
const eventBus = require('./eventBus');
const parentRequire = require('parent-require');
const engineVersion = 'v1.0';
const prefix = 'express-gateway-plugin-'; // TODO make configurable
module.exports.load = function ({config}) {
  config = config || require('./config');
  let pluginsSettings = config.systemConfig.plugins || {};

  let loadedPlugins = [];
  logger.debug('Loading plugins. Plugin engine version:', engineVersion);
  for (let pluginName in pluginsSettings) {
    let settings = pluginsSettings[pluginName] || {};
    let requireName = pluginName;
    if (settings.package) {
      requireName = settings.package;
    } else if (pluginName.indexOf(prefix) !== 0) {
      requireName = prefix + pluginName;
    }

    try {
      logger.debug('Loading plugin', requireName);
      let plugin;
      try {
        plugin = require(requireName); // EG loaded as main module
      } catch (err) {
        plugin = parentRequire(requireName); // EG loaded as library (after eg gateway create)
      }
      if (plugin.version !== engineVersion) { // TODO: versioning of plugins
        logger.warn(plugin.version, 'is different from engine version:', engineVersion, 'trying to load');
      }
      let context = new PluginContext({settings, config});
      plugin.init(context);
      loadedPlugins.push(context);
      logger.info('Loaded plugin', pluginName, 'using from package', requireName);
    } catch (err) {
      logger.error('Failed to load plugin ' + requireName, err);
    }
  }

  // Note: All logic to handle different plugin version should be here
  // Note: Rest of EG code must use only one standard interface
  return {
    policies: extract(loadedPlugins, 'policies'),
    conditions: extract(loadedPlugins, 'conditions'),
    gatewayRoutes: extract(loadedPlugins, 'gatewayRoutes'),
    adminRoutes: extract(loadedPlugins, 'adminRoutes'),
    cliExtensions: extract(loadedPlugins, 'cliExtensions')
  };
};

class PluginContext {
  constructor ({settings, config}) {
    this.logger = logger;
    this.settings = settings || {};
    this.config = config;
    this.policies = [];
    this.conditions = [];
    this.gatewayRoutes = [];
    this.adminRoutes = [];
    this.cliExtensions = [];
    this.eventBus = eventBus;
  }
  registerPolicy (policy) {
    this.policies.push(policy);
  }
  registerCondition (condition) {
    this.conditions.push(condition);
  }
  registerGatewayRoute (gatewayRoute) {
    this.gatewayRoutes.push(gatewayRoute);
  }
  registerAdminRoute (adminRoute) {
    this.adminRoutes.push(adminRoute);
  }
  registerCLIExtension (cliExtension) {
    this.cliExtensions.push(cliExtension);
  }
}

function extract (loadedPlugins, propName) {
  return loadedPlugins.reduce((result, current) => {
    return result.concat(current[propName] || []);
  }, []);
};
