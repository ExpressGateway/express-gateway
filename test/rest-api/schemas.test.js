const should = require('should');
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
          const found = schemasResult.find(schemaResult => schemaResult.schema.$id.includes('proxy'));
          const other = schemasResult.filter(schemaResult => schemaResult.type !== 'policy');
          should(found.schema).not.be.undefined();
          should(found.schema.$id).containEql('proxy');
          should(found.type).be.eql('policy');
          should(other.length).be.eql(0);
        });
    });

    it('should find proxy policy', () => {
      return adminHelper.admin.config.schemas
        .list('http://express-gateway.io/schemas/policies/proxy.json')
        .then((schema) => {
          should(schema.schema.$id).containEql('proxy');
        });
    });
  });
});
