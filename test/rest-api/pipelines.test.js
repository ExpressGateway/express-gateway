const should = require('should');
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
        admin: { port: 0 },
        apiEndpoints: { api: { host: '*' } },
        policies: ['proxy', 'terminate'],
        serviceEndpoints: { backend: { url: 'http://localhost:1010' } }
      };

      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({ config });
    });

    it('should create a new pipeline', () => {
      const testPipeline = {
        apiEndpoints: ['api'],
        policies: [{ proxy: { action: { serviceEndpoint: 'backend' } } }],
        customId: idGen.v4() // NOTE: save operation should allow custom props
      };
      return adminHelper.admin.config.pipelines
        .create('test', testPipeline)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          should(cfg.pipelines.test.apiEndpoints).deepEqual(testPipeline.apiEndpoints);
          should(cfg.pipelines.test.policies).deepEqual(testPipeline.policies);
          should(cfg.pipelines.test).have.property('customId');
        });
    });
  });

  describe('when pipelines defined', () => {
    beforeEach(() => {
      const initialConfig = {
        admin: { port: 0 },
        apiEndpoints: { api: { host: '*' } },
        serviceEndpoints: { backend: { url: 'http://localhost:1010' } },
        policies: ['proxy', 'terminate'],
        pipelines: {
          example: { apiEndpoints: ['example'], policies: [{ terminate: {} }] },
          hello: { apiEndpoints: ['hello'], policies: [{ terminate: {} }] }
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
        policies: [{ proxy: { action: { serviceEndpoint: 'backend' } } }]
      };

      return adminHelper.admin.config.pipelines
        .create('test', testPipeline)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          should(cfg.pipelines.test.apiEndpoints).deepEqual(testPipeline.apiEndpoints);
          should(cfg.pipelines.example.apiEndpoints).deepEqual(['example']);
          should(cfg.pipelines.hello.apiEndpoints).deepEqual(['hello']);
          should(cfg.pipelines.test).have.property('customId');
        });
    });

    it('should not create a new pipeline when the general gateway.config is invalid', () => {
      const testPipeline = {
        apiEndpoints: ['api'],
        customId: idGen.v4(), // NOTE: save operation should allow custom props
        policies: ['proxy', 'terminate']
      };
      return adminHelper.admin.config.pipelines
        .create('invalid', testPipeline)
        .catch(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          should(cfg.pipelines).not.have.property('invalid');
        });
    });

    it('should not create a new pipeline when the a specified policy is invalid', () => {
      const testPipeline = {
        apiEndpoints: ['api'],
        customId: idGen.v4(), // NOTE: save operation should allow custom props
        policies: [{ proxy: {} }]
      };
      return adminHelper.admin.config.pipelines
        .create('invalid', testPipeline)
        .catch(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          should(cfg.pipelines).not.have.property('invalid');
        });
    });

    it('should update existing pipeline', () => {
      const testPipeline = {
        apiEndpoints: ['api'],
        customId: idGen.v4(), // NOTE: save operation should allow custom props
        policies: [{ proxy: { action: { serviceEndpoint: 'backend' } } }]
      };
      return adminHelper.admin.config.pipelines
        .update('example', testPipeline)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          should(cfg.pipelines.example.apiEndpoints).deepEqual(testPipeline.apiEndpoints);
          should(cfg.pipelines.example).have.property('customId');
        });
    });

    it('should delete existing pipeline', () => {
      return adminHelper.admin.config.pipelines
        .remove('example')
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          should(cfg.pipelines.example).not.ok();
        });
    });

    it('should show existing pipeline', () => {
      return adminHelper.admin.config.pipelines
        .info('example')
        .then((endpoint) => {
          should(endpoint.apiEndpoints).be.deepEqual(['example']);
        });
    });

    it('should list all pipelines', () => {
      return adminHelper.admin.config.pipelines
        .list()
        .then((pipelines) => {
          should(pipelines.example.apiEndpoints).be.deepEqual(['example']);
          should(pipelines.hello.apiEndpoints).be.deepEqual(['hello']);
          should(Object.keys(pipelines)).length(2);
        });
    });
  });
});
