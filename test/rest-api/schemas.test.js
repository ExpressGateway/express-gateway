const { assert } = require('chai');
const os = require('os');
const fs = require('fs');
const path = require('path');
const idGen = require('uuid62');
const yaml = require('js-yaml');
const gateway = require('../../lib/gateway');
const adminHelper = require('../common/admin-helper')();
const Config = require('../../lib/config/config');

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
        .then((schemasResult) => {
          const found = schemasResult.find(schemaResult => schemaResult.schema.$id.includes('basic-auth'));
          const other = schemasResult.filter(schemaResult => schemaResult.type !== 'policy');
          assert.include(found.schema.$id, 'basic-auth');
          assert.equal(found.type, 'policy');
          assert.isDefined(found.schema);
          assert.equal(other.length, 0);
        });
    });

    it('should find basic-auth policy', () => {
      return adminHelper.admin.config.schemas
        .list('http://express-gateway.io/schemas/policies/basic-auth.json')
        .then((schema) => {
          assert.include(schema.schema.$id, 'basic-auth');
        });
    });
  });
});
