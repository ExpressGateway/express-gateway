const fs = require('fs');
const path = require('path');
const express = require('express');
const parentRequire = require('parent-require');

const PluginInstaller = require('../../plugin-installer');

let pluginCache = null;

module.exports = function () {
  const router = express.Router();

  router.get('/', function (req, res, next) {
    res.json({ plugins: getPlugins() });
    next();
  });

  router.post('/', function (req, res, next) {
    if (!req.body || !req.body.package) {
      res.status(400);
      next();
      return;
    }

    const installer = PluginInstaller.create();
    const packageSpecifier = req.body.package;

    installer.runNPMInstallation({
      packageSpecifier,
      cwd: process.cwd(),
      env: process.env
    }).then(() => {
      invalidatePluginCache();

      const previousPluginOptions = installer.existingPluginOptions;
      const optionsMeta = installer.pluginManifest.options || {};
      const keys = Object.keys(optionsMeta);
      const options = keys.map(key => {
        return {
          name: key,
          schema: optionsMeta[key],
          value: previousPluginOptions[key]
        };
      });

      res.json({
        name: installer.pluginKey,
        description: installer.pluginManifest.description || null,
        package: installer.packageName,
        version: getPackageVersion(installer.packageName),
        disabled: true,
        state: 'awaiting-configuration',
        options
      });

      next();
    });
  });

  router.get('/:id', function (req, res, next) {
    const filtered = getPlugins()
      .filter(plugin => {
        return plugin.name === req.params.id;
      });

    if (filtered.length) {
      res.json(filtered[0]);
    } else {
      res.status(404);
    }

    next();
  });

  router.put('/:package', function (req, res, next) {
    if (!req.body || !req.params.package) {
      res.status(400);
      next();
      return;
    }

    const packageName = req.params.package;
    const pluginManifest = getPluginManifest(packageName);
    const installer = PluginInstaller.create({ packageName, pluginManifest });

    installer.updateConfigurationFiles({
      pluginOptions: req.body.options,
      enablePlugin: true,
      addPoliciesToWhitelist:
        !!req.params.addPoliciesToGatewayConfig
    }).then(() => {
      const optionKeys = Object.keys(pluginManifest.options);
      const options = optionKeys
        .map(optionKey => {
          return {
            name: optionKey,
            schema: pluginManifest.options[optionKey],
            value: req.body.options[optionKey] ||
              installer.existingPluginOptions[optionKey] ||
              pluginManifest.options[optionKey].default
          };
        });

      res.json({
        name: installer.pluginKey,
        description: pluginManifest.description || null,
        package: packageName,
        version: getPackageVersion(packageName),
        disabled: false,
        state: 'configured',
        options: options
      });

      next();
    })
      .catch(err => {
        next(err);
      });
  });

  return router;
};

function getPlugins () {
  if (pluginCache === null) {
    loadPlugins();
  }

  return pluginCache;
}

function invalidatePluginCache () {
  pluginCache = null;
}

function loadPlugins () {
  const config = require('../../config');

  const keys = Object.keys(config.systemConfig.plugins);
  const plugins = keys.map(key => {
    const plugin = config.systemConfig.plugins[key];
    const packageName = plugin.package ||
      PluginInstaller.PACKAGE_PREFIX + key;

    const pluginManifest = getPluginManifest(packageName);
    const version = getPackageVersion(packageName);

    pluginManifest.options = pluginManifest.options || {};

    const optionKeys = Object.keys(plugin);
    const reserved = ['state', 'disabled', 'package'];
    const options = optionKeys
      .filter(optionKey => reserved.indexOf(optionKey) === -1)
      .map(optionKey => {
        return {
          name: optionKey,
          schema: pluginManifest.options[optionKey],
          value: plugin[optionKey]
        };
      });

    return {
      name: key,
      description: pluginManifest.description || null,
      package: packageName,
      version: version,
      disabled: plugin.disabled || false,
      state: 'configured',
      options: options
    };
  });

  pluginCache = plugins || [];
}

function getPackageVersion (packageName) {
  let version = null;

  try {
    const packageJSON = fs.readFileSync(path.join(process.cwd(),
      'node_modules', packageName, 'package.json'));
    version = JSON.parse(packageJSON.toString()).version;
  } catch (_) {
    version = null;
  }

  return version;
}

function getPluginManifest (packageName) {
  let pluginManifest;

  try {
    pluginManifest = require(packageName);
  } catch (_) {
    pluginManifest = parentRequire(packageName);
  }

  return pluginManifest;
}
