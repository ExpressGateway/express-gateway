const assert = require('assert');
const gateway = require('../../lib/gateway');
const eventBus = require('../../lib/eventBus');
const Config = require('../../lib/config/config');
const request = require('supertest');

let config = new Config();
config.loadGatewayConfig();

describe('gateway routing with plugins', () => {
  let gatewaySrv, httpSrvFromEvent;
  before('fires up a new gateway instance', function () {
    eventBus.on('http-ready', ({httpServer}) => {
      httpSrvFromEvent = httpServer;
    });
    return gateway({
      plugins: {
        gatewayRoutes: [function (gatewayExpressInstance) {
          gatewayExpressInstance.all('/test', (req, res) => res.json({enabled: true}));
        }]},
      config
    }).then(srv => {
      gatewaySrv = srv.app;
      return srv;
    });
  });

  it('should add custom route', () => {
    return request(gatewaySrv)
      .get('/test')
      .then(res => {
        assert.ok(res.body.enabled);
      });
  });
  it('should fire http-ready event', () => {
    assert.ok(httpSrvFromEvent);
    assert.equal(httpSrvFromEvent, gatewaySrv);
  });

  after('close gateway srv', () => {
    gatewaySrv.close();
  });
});
