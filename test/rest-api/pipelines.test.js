const assert = require('assert');
const adminHelper = require('../common/admin-helper')();
const Config = require('../../lib/config/config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const idGen = require('uuid62');
const yaml = require('js-yaml');

describe('REST: pipelines', () => {
  let config;
  beforeEach(() => {
    config = new Config();
    config.gatewayConfigPath = path.join(os.tmpdir(), idGen.v4() + 'yml');
  });

  afterEach(() => {
    return adminHelper.stop();
  });

  describe('when no pipelines defined', () => {
    beforeEach(() => {
      const initialConfig = {
        admin: { port: 0 }
      };
      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({ config });
    });
    it('should create a new pipeline', () => {
      const testPipeline = {
        apiEndpoints: ['api'],
        policies: [{ action: 'proxy' }],
        customId: idGen.v4() // NOTE: save operation should allow custom props
      };
      return adminHelper.admin.config.pipelines
        .create('test', testPipeline)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.deepEqual(cfg.pipelines.test.apiEndpoints, testPipeline.apiEndpoints);
          assert.deepEqual(cfg.pipelines.test.policies, testPipeline.policies);
          assert(cfg.pipelines.test.customId);
        });
    });
  });

  describe('when pipelines defined', () => {
    beforeEach(() => {
      const initialConfig = {
        admin: { port: 0 },
        pipelines: {
          example: { apiEndpoints: ['example'] },
          hello: { apiEndpoints: ['hello'] }
        }
      };
      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({ config });
    });
    it('should create a new pipeline', () => {
      const testPipeline = {
        apiEndpoints: ['api'],
        customId: idGen.v4(), // NOTE: save operation should allow custom props
        policies: [{ action: 'proxy' }]
      };
      return adminHelper.admin.config.pipelines
        .create('test', testPipeline)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.deepEqual(cfg.pipelines.test.apiEndpoints, testPipeline.apiEndpoints);
          assert.deepEqual(cfg.pipelines.example.apiEndpoints, ['example']);
          assert.deepEqual(cfg.pipelines.hello.apiEndpoints, ['hello']);
          assert(cfg.pipelines.test.customId);
        });
    });
    it('should update existing pipeline', () => {
      const testPipeline = {
        apiEndpoints: ['api'],
        customId: idGen.v4(), // NOTE: save operation should allow custom props
        policies: [{ action: 'proxy' }]
      };
      return adminHelper.admin.config.pipelines
        .update('example', testPipeline)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.deepEqual(cfg.pipelines.example.apiEndpoints, testPipeline.apiEndpoints);
          assert(cfg.pipelines.example.customId);
        });
    });

    it('should delete existing pipeline', () => {
      return adminHelper.admin.config.pipelines
        .remove('example')
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert(!cfg.pipelines.example);
        });
    });
    it('should show existing pipeline', () => {
      return adminHelper.admin.config.pipelines
        .info('example')
        .then((endpoint) => {
          assert.deepEqual(endpoint.apiEndpoints, ['example']);
        });
    });
    it('should list all pipelines', () => {
      return adminHelper.admin.config.pipelines
        .list()
        .then((pipelines) => {
          assert.deepEqual(pipelines.example.apiEndpoints, ['example']);
          assert.deepEqual(pipelines.hello.apiEndpoints, ['hello']);
          assert.equal(Object.keys(pipelines).length, 2);
        });
    });
  });
});
