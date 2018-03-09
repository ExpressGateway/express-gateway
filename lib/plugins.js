const logger = require('./logger').plugins;
const eventBus = require('./eventBus');
const schemas = require('./schemas');
const parentRequire = require('parent-require');
const engineVersion = '1.2.0';
const semver = require('semver');
const prefix = 'express-gateway-plugin-'; // TODO make configurable
module.exports.load = function ({ config }) {
  config = config || require('./config');
  const pluginsSettings = config.systemConfig.plugins || {};

  const loadedPlugins = [];
  logger.debug('Loading plugins. Plugin engine version:', engineVersion);
  for (const pluginName in pluginsSettings) {
    const settings = pluginsSettings[pluginName] || {};
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
      if (semver.lt(engineVersion, plugin.version)) { // TODO: versioning of plugins
        logger.warn(plugin.version, 'is higher than engine version:', engineVersion, 'trying to load');
      }

      // register schema and validate settings
      try {
        schemas.register('plugin', pluginName, plugin.schema)(settings);
      } catch (e) {
        logger.error(`Wrong schema definition for ${pluginName}`, e);
      }

      const services = require('./services');
      const context = new PluginContext({ settings, config, services });
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
  constructor ({ settings, config, services }) {
    this.logger = logger;
    this.services = services;
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

  registerGatewayRoute (gatewayRoutesDeclaration) {
    this.gatewayRoutes.push(gatewayRoutesDeclaration);
  }

  registerAdminRoute (adminRoutesDeclaration) {
    this.adminRoutes.push(adminRoutesDeclaration);
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
