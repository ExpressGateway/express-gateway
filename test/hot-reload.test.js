const serverHelper = require('./common/server-helper');
const assert = require('chai').assert;
const gateway = require('../src/gateway');
const tmp = require('tmp');
const fileHelper = require('./common/temp.config.helper')
const request = require('supertest');
const port1 = 5998;
const port2 = 5999;
const gatewayPort = 5997;
let app1, app2, appTarget, tmpConfigFile;

['JSON', 'YAML'].forEach(function(configType) {
  let helper = fileHelper[configType]
  let configTemplate = helper.readTemplate();
  describe('hot-reload ' + configType, () => {
    before('start servers', async() => {
      app1 = (await serverHelper.generateBackendServer(port1)).app
      app2 = (await serverHelper.generateBackendServer(port2)).app;
      tmpConfigFile = tmp.fileSync({ postfix: '.' + configType.toLocaleLowerCase() });
      configTemplate.serviceEndpoints.backend.url = 'http://localhost:' + port1;
      helper.saveTempFile(configTemplate, tmpConfigFile.name)
      appTarget = (await gateway.start({
        configPath: tmpConfigFile.name,
        defaultBindPort: gatewayPort,
        defaultBindHost: '127.0.0.1'
      })).app;
    });

    it('should proxy to server on ' + port1, (done) => {
      request(appTarget).get('/')
        .set('Host', 'test.com')
        .expect(200)
        .expect('Content-Type', /text/)
        .end(function(error, res) {
          if (error) {
            done(error);
          }
          assert.ok(res.text.indexOf(port1) >= 0);
          done();
        });
    });

    it('should proxy to server on ' + port2, (done) => {
      configTemplate.serviceEndpoints.backend.url = 'http://localhost:' + port2;
      helper.saveTempFile(configTemplate, tmpConfigFile.name)
      request(appTarget).get('/')
        .set('Host', 'test.com')
        .expect(200)
        .expect('Content-Type', /text/)
        .end(function(err, res) {
          if (err) {
            done(err);
          }
          assert.ok(res.text.indexOf(port2) >= 0);
          done();
        });
    });

    after(() => {
      app1.close();
      app2.close();
      appTarget.close();
    });
  });
});