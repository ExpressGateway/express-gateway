const assert = require('assert');
const adminHelper = require('../common/admin-helper')();
const Config = require('../../lib/config/config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const idGen = require('uuid62');
const yaml = require('js-yaml');

describe('REST: policies', () => {
  let config;
  beforeEach(() => {
    config = new Config();
    config.gatewayConfigPath = path.join(os.tmpdir(), idGen.v4() + 'yml');
  });

  afterEach(() => {
    return adminHelper.stop();
  });

  describe('when no policies defined', () => {
    beforeEach(() => {
      const initialConfig = {
        admin: { port: 0 }
      };
      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({ config });
    });
    it('should activate new policy', () => {
      return adminHelper.admin.config.policies
        .activate('test')
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.deepStrictEqual(cfg.policies, ['test']);
        });
    });
  });

  describe('when policies defined', () => {
    beforeEach(() => {
      const initialConfig = {
        admin: { port: 0 },
        policies: ['example', 'hello']
      };
      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({ config });
    });
    it('should create a new api endpoint', () => {
      return adminHelper.admin.config.policies
        .activate('test')
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.deepStrictEqual(cfg.policies, ['example', 'hello', 'test']);
        });
    });

    it('should deactivate existing policy', () => {
      return adminHelper.admin.config.policies
        .deactivate('example')
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.deepStrictEqual(cfg.policies, ['hello']);
        });
    });
    it('should list all enabled policies', () => {
      return adminHelper.admin.config.policies
        .list()
        .then((policies) => {
          assert.deepStrictEqual(policies, ['example', 'hello']);
        });
    });
  });
});
