const serverHelper = require('./common/server-helper');
const assert = require('chai').assert;
const fs = require('fs');
const gateway = require('../lib/gateway');
const path = require('path');
const fileHelper = require('./common/file-helper');
const request = require('supertest');
const port1 = 5998;
const port2 = 5999;
let config = require('../lib/config');

['json', 'yml'].forEach(function (configType) {
  let configDirectory, app1, app2, appTarget, httpsApp;
  let originalGatewayConfig = config.gatewayConfig;
  let configTemplate = fileHelper.read(path.join(__dirname, 'fixtures/hot-reload.template.config.' + configType), configType);
  describe.skip('hot-reload ' + configType, () => {
    before('start servers', () => {
      serverHelper.generateBackendServer(port1)
        .then(apps => {
          app1 = apps.app;
          return serverHelper.generateBackendServer(port2);
        })
        .then(apps => {
          app2 = apps.app;

          if (configType === 'yml') {
            fs.renameSync(path.join(__dirname, 'config/gateway.config.json'), path.join(__dirname, 'config/gateway.config.yml'));
          } else fs.renameSync(path.join(__dirname, 'config/gateway.config.yml'), path.join(__dirname, 'config/gateway.config.json'));

          configDirectory = path.join(__dirname, 'config/gateway.config.' + configType);

          configTemplate.serviceEndpoints.backend.url = 'http://localhost:' + port1;
          fileHelper.save(configTemplate, configDirectory, configType);

          return gateway();
        })
        .then(apps => {
          appTarget = apps.app;
          httpsApp = apps.httpsApp;
        });
    });

    after(() => {
      config.gatewayConfig = originalGatewayConfig;
      fileHelper.save(originalGatewayConfig, path.join(__dirname, 'config/gateway.config.yml'), 'yml');
      app1.close();
      app2.close();
      appTarget.close();
      httpsApp && httpsApp.close();
    });

    it('should proxy to server on ' + port1, (done) => {
      request(appTarget).get('/')
        .set('Host', 'test.com')
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
      configTemplate.serviceEndpoints.backend.url = 'http://localhost:' + port2;
      fileHelper.save(configTemplate, configDirectory, configType);
      request(appTarget).get('/')
        .set('Host', 'test.com')
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
  });
});
