const fs = require('fs');
const path = require('path');
const util = require('util');

const assert = require('chai').assert;
const cpr = require('cpr');
const rimraf = require('rimraf');
const tmp = require('tmp');
const yaml = require('js-yaml');

require('util.promisify/shim')();

const PluginInstaller = require('../../lib/plugin-installer');

const gatewayDirectory = path.join(
  __dirname,
  '..',
  'fixtures',
  'plugin-installer'
);

const PACKAGE_NAME = 'express-gateway-plugin-test';

const pluginDirectory = path.join(
  __dirname,
  '..',
  'fixtures',
  PACKAGE_NAME
);

let tempPath = null;
let configPath = null;

const config = {
  systemConfigPath: null,
  gatewayConfigPath: null,
  systemConfig: null,
  gatewayConfig: null
};

describe('PluginInstaller#runNPMInstallation', () => {
  before(() => {
    return util.promisify(tmp.dir)()
      .then(temp => {
        tempPath = temp;
        return util.promisify(cpr)(gatewayDirectory, tempPath);
      })
      .then(files => {
        configPath = path.join(tempPath, 'config');
        config.systemConfigPath = path.join(configPath, 'system.config.yml');
        config.gatewayConfigPath = path.join(configPath, 'gateway.config.yml');
      });
  });

  after(done => {
    rimraf(tempPath, done);
  });

  it('installs an package using a file-system package specifier', () => {
    const installer = PluginInstaller.create({ config });
    return installer.runNPMInstallation({
      packageSpecifier: pluginDirectory,
      cwd: tempPath,
      env: Object.assign({}, process.env)
    })
    .then(({ packageName, pluginManifest }) => {
      assert.equal(packageName, PACKAGE_NAME);
      assert(pluginManifest);
    });
  });

  it('updates configuration for a plugin', () => {
    const installer = PluginInstaller.create({
      packageName: PACKAGE_NAME,
      pluginManifest: require(pluginDirectory),
      config
    });

    const pluginOptions = {
      foo: 'abcdefg',
      baz: 12345
    };

    return installer.updateConfigurationFiles({
      pluginOptions,
      enablePlugin: true,
      addPoliciesToWhitelist: true
    }).then(() => {
      const systemConfigData = fs.readFileSync(config.systemConfigPath);
      const systemConfig = yaml.load(systemConfigData.toString());
      const comparison =
        Object.assign({ package: PACKAGE_NAME }, pluginOptions);

      assert.deepEqual(systemConfig.plugins.test, comparison);

      const gatewayConfigData = fs.readFileSync(config.gatewayConfigPath);
      const gatewayConfig = yaml.load(gatewayConfigData.toString());

      assert(gatewayConfig.policies.indexOf('policy1') > -1);
      assert(gatewayConfig.policies.indexOf('policy2') > -1);
    })
  });
});
