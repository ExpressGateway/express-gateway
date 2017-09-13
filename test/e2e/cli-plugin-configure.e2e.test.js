const fs = require('fs');
const path = require('path');
const util = require('util');

const assert = require('chai').assert;
const cpr = require('cpr');
const rimraf = require('rimraf');
const tmp = require('tmp');
const yaml = require('js-yaml');

require('util.promisify/shim')();

const { runCLICommand } = require('../common/cli.helper');

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
  gatewayConfigPath: null
};

describe.skip('E2E: eg plugins configure', () => {
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
      })
      .then(() => {
        return runCLICommand({
          cliArgs: ['plugins', 'install', pluginDirectory, '-n', '-g',
            '-o', '"foo=bar"',
            '-o', '"baz=4444"'],
          adminPort: 0,
          configDirectoryPath: configPath,
          cliExecOptions: {
            cwd: tempPath
          }
        });
      });
  });

  after(done => {
    rimraf(tempPath, done);
  });

  it('configures a plugin using the package abbreviation', () => {
    runCLICommand({
      cliArgs: ['plugins', 'configure', 'test', '-n',
        '-o', '"foo=bar"',
        '-o', '"baz=4444"'],
      adminPort: 0,
      configDirectoryPath: configPath,
      cliExecOptions: {
        cwd: tempPath
      }
    })
    .then(() => {
      const systemConfigData = fs.readFileSync(config.systemConfigPath);
      const systemConfig = yaml.load(systemConfigData.toString());

      const expected = {
        test: {
          package: 'express-gateway-plugin-test',
          foo: 'bar',
          baz: '4444'
        }
      };

      assert.deepEqual(systemConfig.plugins, expected);
    });
  });
});
