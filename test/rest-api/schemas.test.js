const assert = require('assert');
const gateway = require('../../lib/gateway');
const adminHelper = require('../common/admin-helper')();
const Config = require('../../lib/config/config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const idGen = require('uuid-base62');
const yaml = require('js-yaml');

describe('REST: schemas', () => {
  let config;
  beforeEach(() => {
    config = new Config();
    config.gatewayConfigPath = path.join(os.tmpdir(), idGen.v4() + 'yml');
  });

  afterEach(() => {
    return adminHelper.stop();
  });

  let gatewaySrv;
  before('fires up a new gateway instance', function () {
    return gateway({config}).then(srv => {
      gatewaySrv = srv.app;
      return srv;
    });
  });

  after('close gateway srv', () => {
    gatewaySrv.close();
  });

  describe('when policies defined', () => {
    beforeEach(() => {
      const initialConfig = {
        admin: {port: 0}
      };
      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({config});
    });

    it('should list all policy schemas', () => {
      return adminHelper.admin.config.schemas
        .list('policy')
        .then(({schemas}) => {
          const found = schemas.find(({name}) => name === 'basic-auth');
          const other = schemas.filter(({type}) => type !== 'policy');
          assert.equal(found.type, 'policy');
          assert.equal(found.name, 'basic-auth');
          assert.equal(other.length, 0);
        });
    });

    it('should find basic-auth policy', () => {
      return adminHelper.admin.config.schemas
        .list('policy', 'basic-auth')
        .then(({schemas}) => {
          assert.equal(schemas.length, 1);
          assert.equal(schemas[0].name, 'basic-auth');
        });
    });
  });
});
