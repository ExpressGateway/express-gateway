const path = require('path');
const fs = require('fs');
const request = require('supertest');
const assert = require('chai').assert;

const config = require('../../../lib/config');
const gateway = require('../../../lib/gateway');
const { findOpenPortNumbers } = require('../../common/server-helper');

const originalGatewayConfig = config.gatewayConfig;

const serverKeyFile = path.join(__dirname, '../../fixtures/certs/server', 'server.key');
const serverCertFile = path.join(__dirname, '../../fixtures/certs/server', 'server.crt');
const invalidClientCertFile = path.join(__dirname, '../../fixtures', 'agent1-cert.pem');
const clientKeyFile = path.join(__dirname, '../../fixtures/certs/client', 'client.key');
const clientCertFile = path.join(__dirname, '../../fixtures/certs/client', 'client.crt');
const chainFile = path.join(__dirname, '../../fixtures/certs/chain', 'chain.pem');

let backendServerPort;

function expectedResponse (app, status, contentType) {
  return request(app).get('/endpoint').expect(status).expect('Content-Type', contentType);
}

describe('proxy policy', () => {
  const defaultProxyOptions = {
    target: {
      keyFile: clientKeyFile,
      certFile: clientCertFile,
      caFile: chainFile
    }
  };
  let app, backendServer;

  before('start HTTP server', (done) => {
    findOpenPortNumbers(1).then((ports) => {
      const https = require('https');
      const express = require('express');
      const expressApp = express();

      backendServerPort = ports[0];

      expressApp.all('*', function (req, res) {
        res.status(200).json();
      });

      backendServer = https.createServer({
        key: fs.readFileSync(serverKeyFile),
        cert: fs.readFileSync(serverCertFile),
        ca: fs.readFileSync(chainFile),
        requestCert: true,
        rejectUnauthorized: true
      }, expressApp);

      backendServer.listen(backendServerPort, done);
    });
  });

  after('clean up', (done) => {
    config.gatewayConfig = originalGatewayConfig;
    backendServer.close(done);
  });

  describe('proxyOptions', () => {
    it('raises an error when incorrect TLS file paths are provided', (done) => {
      const serviceOptions = { target: { keyFile: '/non/existent/file.key' } };

      setupGateway(serviceOptions).catch(err => {
        assert.match(err.message, /no such file or directory/);
        done();
      });
    });

    describe('when incorrect proxy options are provided', () => {
      before(() => {
        const serviceOptions = { target: { certFile: invalidClientCertFile } };

        return setupGateway(serviceOptions).then(apps => {
          app = apps.app;
        });
      });

      after((done) => {
        app.close(done);
      });

      it('responds with a bad gateway error', () => {
        return expectedResponse(app, 502, /text\/html/);
      });
    });

    describe('when proxy options are specified on the serviceEndpoint', () => {
      before(() => {
        return setupGateway(defaultProxyOptions).then(apps => {
          app = apps.app;
        });
      });

      after((done) => {
        app.close(done);
      });

      it('passes options to proxy', () => {
        return expectedResponse(app, 200, /json/);
      });
    });

    describe('When proxy options are specified on the policy action', () => {
      describe('and no proxy options are specified on the serviceEndpoint', () => {
        before(() => {
          return setupGateway({}, defaultProxyOptions).then(apps => {
            app = apps.app;
          });
        });

        after((done) => {
          app.close(done);
        });

        it('passes options to proxy', () => {
          return expectedResponse(app, 200, /json/);
        });
      });

      describe('and proxy options are also specified on the serviceEndpoint', () => {
        before(() => {
          const serviceOptions = { target: { certFile: invalidClientCertFile } };
          return setupGateway(serviceOptions, defaultProxyOptions).then(apps => {
            app = apps.app;
          });
        });

        after((done) => {
          app.close(done);
        });

        it('uses both configurations, with policy proxy options taking precedence', () => {
          return expectedResponse(app, 200, /json/);
        });
      });
    });
  });
});

function setupGateway (serviceOptions = {}, policyOptions = {}) {
  return findOpenPortNumbers(1).then((ports) => {
    config.gatewayConfig = {
      http: { port: ports[0] },
      apiEndpoints: {
        test: {}
      },
      serviceEndpoints: {
        backend: {
          url: `https://localhost:${backendServerPort}`,
          proxyOptions: serviceOptions
        }
      },
      policies: ['proxy'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: [{
            proxy: [{
              action: { proxyOptions: policyOptions, serviceEndpoint: 'backend' }
            }]
          }]
        }
      }
    };

    return gateway();
  });
}
