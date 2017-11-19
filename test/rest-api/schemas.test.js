const { assert } = require('chai');
const gateway = require('../../lib/gateway');
const adminHelper = require('../common/admin-helper')();
const Config = require('../../lib/config/config');
const os = require('os');
const fs = require('fs');
const path = require('path');
const idGen = require('uuid/v4');
const yaml = require('js-yaml');

describe('REST: schemas', () => {
  let config;
  beforeEach(() => {
    config = new Config();
    config.gatewayConfigPath = path.join(os.tmpdir(), idGen() + 'yml');
  });

  afterEach(() => {
    return adminHelper.stop();
  });

  let gatewaySrv;
  before('fires up a new gateway instance', function () {
    return gateway({ config }).then(srv => {
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
        admin: { port: 0 }
      };
      fs.writeFileSync(config.gatewayConfigPath, yaml.dump(initialConfig));
      config.loadGatewayConfig();
      return adminHelper.start({ config });
    });

    it('should list all policy schemas', () => {
      return adminHelper.admin.config.schemas
        .list('policy')
        .then((schemas) => {
          const found = schemas.find(schema => schema.name === 'basic-auth');
          const other = schemas.filter(schema => schema.type !== 'policy');
          assert.equal(found.name, 'basic-auth');
          assert.equal(found.type, 'policy');
          assert.isDefined(found.schema);
          assert.equal(other.length, 0);
        });
    });

    it('should find basic-auth policy', () => {
      return adminHelper.admin.config.schemas
        .list('policy', 'basic-auth')
        .then((schema) => {
          assert.equal(schema.name, 'basic-auth');
        });
    });
  });
});
