'use strict';
const serverHelper = require('../common/server-helper');
const assert = require('chai').assert;
const gateway = require('../../src/gateway');
const tmp = require('tmp');
const fileHelper = require('../common/temp.config.helper')
const request = require('request');
const port1 = 5998;
const port2 = 5999;
const gatewayPort = 5997;
let app1, app2, appTarget, tmpConfigFile;

// technically YAML can read JSON files, need to discuss if explicit JSON file support is needed
['JSON', 'YAML'].forEach(function(configType) {
  let helper = fileHelper[configType]
  let configTemplate = helper.readTemplate();
  describe('hot-reload ' + configType, () => {
    before('start servers', (done) => {
      serverHelper.generateBackendServer(port1)
        .then((srv1) => {
          app1 = srv1.app;
          return serverHelper.generateBackendServer(port2);
        })
        .then((srv2) => {
          app2 = srv2.app;
          tmpConfigFile = tmp.fileSync({ postfix: '.' + configType.toLocaleLowerCase() });
          configTemplate.privateEndpoints.backend.url = 'http://localhost:' + port1;
          helper.saveTempFile(configTemplate, tmpConfigFile.name)
          return gateway.start({
            configPath: tmpConfigFile.name,
            defaultBindPort: gatewayPort,
            defaultBindHost: '127.0.0.1'
          });
        })
        .then((srvTarget) => {
          appTarget = srvTarget.app;
          done();
        }).catch(err => {
          done(err);
        });
    });

    it('should proxy to server on ' + port1, (done) => {
      request('http://localhost:' + gatewayPort, (error, response, body) => {
        if (error) {
          done(error);
        }
        assert.ok(body.indexOf(port1) >= 0);
        done();
      });
    });

    it('should proxy to server on ' + port2, (done) => {
      configTemplate.privateEndpoints.backend.url = 'http://localhost:' + port2;
      helper.saveTempFile(configTemplate, tmpConfigFile.name)
      request('http://localhost:' + gatewayPort, (error, response, body) => {
        if (error) {
          done(error);
        }
        assert.ok(body.indexOf(port2) >= 0);
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