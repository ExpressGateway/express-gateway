const assert = require('assert');
const adminHelper = require('../common/admin-helper')();
const Config = require('../../lib/config/config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const idGen = require('uuid-base62');
const yaml = require('js-yaml');

describe('REST: api endpoints', () => {
  let config;
  beforeEach(() => {
    config = new Config();
    config.gatewayConfigPath = path.join(os.tmpdir(), idGen.v4() + 'yml');
  });

  afterEach(() => {
    return adminHelper.stop();
  });

  describe('when no api endpoints defined', () => {
    beforeEach(() => {
      const initialConfig = {
        admin: {port: 0},
        apiEndpoints: null
      };
      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({config});
    });
    it('should create a new api endpoint', () => {
      const testEndpoint = {
        host: 'express-gateway.io',
        customId: idGen.v4()
      };
      return adminHelper.admin.config.apiEndpoints
        .create('test', testEndpoint)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.equal(cfg.apiEndpoints.test.host, testEndpoint.host);
          assert(cfg.apiEndpoints.test.customId);
        });
    });
  });

  describe('when api endpoints defined', () => {
    beforeEach(() => {
      const initialConfig = {
        admin: {port: 0},
        apiEndpoints: {
          example: {host: 'example.com'},
          hello: {host: 'hello.com'}
        }
      };
      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({config});
    });
    it('should create a new api endpoint', () => {
      const testEndpoint = {
        host: 'express-gateway.io',
        customId: idGen.v4()
      };
      return adminHelper.admin.config.apiEndpoints
        .create('test', testEndpoint)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.equal(cfg.apiEndpoints.test.host, testEndpoint.host);
          assert.equal(cfg.apiEndpoints.example.host, 'example.com');
          assert.equal(cfg.apiEndpoints.hello.host, 'hello.com');
          assert(cfg.apiEndpoints.test.customId);
        });
    });
    it('should update existing endpoint', () => {
      const testEndpoint = {
        host: 'express-gateway.io',
        customId: idGen.v4()
      };
      return adminHelper.admin.config.apiEndpoints
        .update('example', testEndpoint)
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert.equal(cfg.apiEndpoints.example.host, testEndpoint.host);
          assert(cfg.apiEndpoints.example.customId);
        });
    });

    it('should delete existing endpoint', () => {
      return adminHelper.admin.config.apiEndpoints
        .remove('example')
        .then(() => {
          const data = fs.readFileSync(config.gatewayConfigPath, 'utf8');
          const cfg = yaml.load(data);
          assert(!cfg.apiEndpoints.example);
        });
    });
    it('should show existing endpoint', () => {
      return adminHelper.admin.config.apiEndpoints
        .info('example')
        .then((endpoint) => {
          assert.equal(endpoint.host, 'example.com');
        });
    });
    it('should list all endpoints', () => {
      return adminHelper.admin.config.apiEndpoints
        .list()
        .then((endpoints) => {
          assert.equal(endpoints.example.host, 'example.com');
          assert.equal(endpoints.hello.host, 'hello.com');
          assert.equal(Object.keys(endpoints).length, 2);
        });
    });
  });
});
