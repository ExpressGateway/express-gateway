const assert = require('assert');
const admin = require('../../lib/rest');
const eventBus = require('../../lib/eventBus');
const request = require('supertest');
describe('admin with plugins', () => {
  let adminSrv, adminSrvFromEvent;
  before('fires up a new admin instance', function () {
    eventBus.on('admin-ready', ({adminServer}) => {
      adminSrvFromEvent = adminServer;
    });
    return admin({
      plugins: {
        adminExtensions: [function (adminExpressInstance) {
          adminExpressInstance.all('/test', (req, res) => res.json({enabled: true}));
        }]},
      config: {
        gatewayConfig: {
          admin: {
            port: 0
          }
        }
      }
    }).then(srv => {
      adminSrv = srv;
      return srv;
    });
  });

  it('should add custom route', () => {
    return request(adminSrv)
      .get('/test')
      .then(res => {
        assert.ok(res.body.enabled);
      });
  });
  it('should fire admin-ready event', () => {
    assert.ok(adminSrvFromEvent);
    assert.equal(adminSrvFromEvent, adminSrv);
  });

  after('close admin srv', () => {
    adminSrv.close();
  });
});
