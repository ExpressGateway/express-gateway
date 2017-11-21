const assert = require('assert');
const adminHelper = require('../common/admin-helper')();
const Config = require('../../lib/config/config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const idGen = require('uuid/v4');
const yaml = require('js-yaml');

describe('REST: service endpoints', () => {
  let config;
  beforeEach(() => {
    config = new Config();
    config.gatewayConfigPath = path.join(os.tmpdir(), idGen() + 'yml');
  });

  afterEach(() => {
    return adminHelper.stop();
  });

  describe('when no service endpoints defined', () => {
    beforeEach(() => {
      const initialConfig = {
        admin: { port: 0 },
        serviceEndpoints: null
      };
      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({ config });
    });
    it('should create a new service endpoint', () => {
      const testEndpoint = {
        url: 'express-gateway.io',
        customId: idGen()
      };
      return adminHelper.admin.config.serviceEndpoints
        .create('test', testEndpoint)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.equal(cfg.serviceEndpoints.test.url, testEndpoint.url);
          assert(cfg.serviceEndpoints.test.customId);
        });
    });
  });

  describe('when service endpoints defined', () => {
    beforeEach(() => {
      const initialConfig = {
        admin: { port: 0 },
        serviceEndpoints: {
          example: { url: 'example.com' },
          hello: { url: 'hello.com' }
        }
      };
      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({ config });
    });
    it('should create a new service endpoint', () => {
      const testEndpoint = {
        url: 'express-gateway.io',
        customId: idGen() // NOTE: save operation should allow custom props
      };
      return adminHelper.admin.config.serviceEndpoints
        .create('test', testEndpoint)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.equal(cfg.serviceEndpoints.test.url, testEndpoint.url);
          assert.equal(cfg.serviceEndpoints.example.url, 'example.com');
          assert.equal(cfg.serviceEndpoints.hello.url, 'hello.com');
          assert(cfg.serviceEndpoints.test.customId);
        });
    });
    it('should update existing endpoint', () => {
      const testEndpoint = {
        url: 'express-gateway.io',
        customId: idGen()
      };
      return adminHelper.admin.config.serviceEndpoints
        .update('example', testEndpoint)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.equal(cfg.serviceEndpoints.example.url, testEndpoint.url);
          assert(cfg.serviceEndpoints.example.customId);
        });
    });

    it('should delete existing endpoint', () => {
      return adminHelper.admin.config.serviceEndpoints
        .remove('example')
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert(!cfg.serviceEndpoints.example);
        });
    });
    it('should show existing endpoint', () => {
      return adminHelper.admin.config.serviceEndpoints
        .info('example')
        .then((endpoint) => {
          assert.equal(endpoint.url, 'example.com');
        });
    });
    it('should list all endpoints', () => {
      return adminHelper.admin.config.serviceEndpoints
        .list()
        .then((endpoints) => {
          assert.equal(endpoints.example.url, 'example.com');
          assert.equal(endpoints.hello.url, 'hello.com');
          assert.equal(Object.keys(endpoints).length, 2);
        });
    });
  });
});
