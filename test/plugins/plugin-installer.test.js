const fs = require('fs');
const path = require('path');
const util = require('util');

const should = require('should');
const cpr = require('cpr');
const rimraf = require('rimraf');
const tmp = require('tmp');
const yaml = require('js-yaml');

const PluginInstaller = require('../../lib/plugin-installer');
const PACKAGE_NAME = 'express-gateway-plugin-test';

const gatewayDirectory = path.join(__dirname, '../../lib/config');
const pluginDirectory = path.join(__dirname, '../fixtures', PACKAGE_NAME);

let tempPath = null;

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
        return util.promisify(cpr)(gatewayDirectory, path.join(tempPath, 'config'), { filter: file => file.includes('.yml') });
      })
      .then(files => {
        const configPath = path.join(tempPath, 'config');
        fs.writeFileSync(path.join(tempPath, 'package.json'), JSON.stringify({ name: '', version: '1.0.0', main: 'server.js' }));
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
        should(packageName).be.eql(PACKAGE_NAME);
        should(pluginManifest).ok();
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
      const systemConfigData = fs.readFileSync(config.systemConfigPath, 'utf8');
      const systemConfig = yaml.load(systemConfigData.toString());
      const comparison =
        Object.assign({ package: PACKAGE_NAME }, pluginOptions);

      should(systemConfig.plugins.test).be.deepEqual(comparison);

      const gatewayConfigData = fs.readFileSync(config.gatewayConfigPath);
      const gatewayConfig = yaml.load(gatewayConfigData.toString());

      should(gatewayConfig.policies.indexOf('policy1')).be.greaterThan(-1);
      should(gatewayConfig.policies.indexOf('policy2')).be.greaterThan(-1);
    });
  });
});
