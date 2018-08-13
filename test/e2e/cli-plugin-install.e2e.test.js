const fs = require('fs');
const path = require('path');
const util = require('util');

const should = require('should');
const cpr = require('cpr');
const rimraf = require('rimraf');
const tmp = require('tmp');
const yaml = require('js-yaml');

const PACKAGE_NAME = 'express-gateway-plugin-test';

const gatewayDirectory = path.join(__dirname, '../../lib/config');
const pluginDirectory = path.join(__dirname, '../fixtures', PACKAGE_NAME);
const { runCLICommand } = require('../common/cli.helper');

let tempPath = null;

const config = {
  systemConfigPath: null,
  gatewayConfigPath: null
};

describe('E2E: eg plugins install', () => {
  before(() => {
    return util.promisify(tmp.dir)()
      .then(temp => {
        tempPath = temp;
        const _cpr = util.promisify(cpr);
        return _cpr(gatewayDirectory, tempPath);
      })
      .then(() => {
        config.systemConfigPath = path.join(tempPath, 'system.config.yml');
        config.gatewayConfigPath = path.join(tempPath, 'gateway.config.yml');

        return runCLICommand({
          cliArgs: ['plugins', 'install', pluginDirectory, '-n', '-g',
            '-o', '"foo=bar"',
            '-o', '"baz=4444"'],
          adminPort: 0,
          configDirectoryPath: tempPath,
          cliExecOptions: { cwd: tempPath }
        });
      });
  });

  after(done => {
    rimraf(tempPath, done);
  });

  it('installs a plugin with a directory package specifier', () => {
    const systemConfigData = fs.readFileSync(config.systemConfigPath);
    const systemConfig = yaml.load(systemConfigData.toString());

    const expected = {
      test: {
        package: 'express-gateway-plugin-test',
        foo: 'bar',
        baz: '4444'
      }
    };

    should(systemConfig.plugins).be.deepEqual(expected);
  });
});
