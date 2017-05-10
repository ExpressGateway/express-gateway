const logger = require('../log').config;
const policies = require('../policies');
const npm = require('npm');
const conditionals = require('../conditionals');

module.exports.loadPlugins = async function(app, config) {
  logger.info('running plugins' + JSON.stringify(config.policies));
  return new Promise((resolve, reject) => {
    if (!config.policies || config.policies.length === 0) {
      return resolve({})
    }

    // Npm Install will take some significant time.
    // If you preinstall every package you may not need auto load
    if (config.skipInstall) {
      try {
        load(app, config)
      } catch (err) {
        reject(err)
      }
      return resolve({});
    }

    // typical time 5+ seconds
    npm.load((npmErr) => {
      if (npmErr) {
        logger.error('NPM failed to initialize', npmErr);
        return reject(npmErr)
      }

      let installList = config.policies.map(resolvePackageName) || [];
      logger.info('Installing packages %j', installList)

      npm.commands.install(installList, (er, data) => {
        if (er) {
          logger.error('Installation failed, check that such npm package exists', er)
        }
        logger.debug(data);
        try {
          load(app, config)
        } catch (err) {
          reject(err)
        }
        resolve({});
      });

      npm.on('log', (message) => {
        // log installation progress
        logger.debug("Install-log: %s", message);
      });
    });
  })

}

function load(app, config) {
  for (let plugin of config.policies || []) {
    try {
      require(resolvePackageName(plugin))({
        app, // the express app. can attach handlers
        policies, // can attach policies using register method
        conditionals, // can attach conditionals using register method
        params: plugin // data provided as part of the EG config file
      });
    } catch (err) {
      logger.error('Failed to load plugin', plugin, err)
      throw err;
    }
  }
}

function resolvePackageName(plugin) {
  return plugin.name ? 'express-gateway-policy-' + plugin.name : plugin.package
}