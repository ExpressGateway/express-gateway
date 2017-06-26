const serverHelper = require('../common/server-helper');
const assert = require('chai').assert;
let config = require('../../lib/config');
const request = require('supertest');
const port1 = 5998;
const port2 = 5999;
let app1, app2, appTarget;

const gateway = require('../../lib/gateway');

describe('multi step policy ', () => {
  let originalGatewayConfig;

  before('start servers', (done) => {
    originalGatewayConfig = config.gatewayConfig;

    config.gatewayConfig = {
      http: { port: 9091 },
      apiEndpoints: {
        test: {}
      },
      serviceEndpoints: {
        admin: {
          url: 'http://localhost:' + port1
        },
        staff: {
          url: 'http://localhost:' + port2
        }
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: [{
            proxy: [{
              condition: { name: 'pathExact', path: '/admin' },
              action: { name: 'proxy', serviceEndpoint: 'admin' }
            }, {
              condition: { name: 'pathExact', path: '/staff' },
              action: { name: 'proxy', serviceEndpoint: 'staff' }
            }]
          }]
        }
      }
    };

    serverHelper.generateBackendServer(port1)
      .then(apps => {
        app1 = apps.app;
        return serverHelper.generateBackendServer(port2);
      })
      .then(apps => {
        app2 = apps.app;
        return gateway();
      })
      .then(apps => {
        appTarget = apps.app;
        done();
      });
  });

  it('should proxy to server on ' + port1, (done) => {
    request(appTarget).get('/admin')
      .expect(200)
      .expect('Content-Type', /text/)
      .end(function (error, res) {
        if (error) {
          done(error);
        }
        assert.ok(res.text.indexOf(port1) >= 0);
        done();
      });
  });

  it('should proxy to server on ' + port2, (done) => {
    request(appTarget).get('/staff')
      .expect(200)
      .expect('Content-Type', /text/)
      .end(function (err, res) {
        if (err) {
          done(err);
        }
        assert.ok(res.text.indexOf(port2) >= 0);
        done();
      });
  });

  after(() => {
    config.gatewayConfig = originalGatewayConfig;

    app1.close();
    app2.close();
    appTarget.close();
  });
});
