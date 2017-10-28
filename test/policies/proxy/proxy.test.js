const path = require('path');
const fs = require('fs');
const request = require('supertest');
const assert = require('chai').assert;
const https = require('https');
const express = require('express');
const expressApp = express();

const config = require('../../../lib/config');
const gateway = require('../../../lib/gateway');

const originalGatewayConfig = config.gatewayConfig;
const port = 5998;

const serverKeyFile = path.join(__dirname, '../../fixtures/certs/server', 'server.key');
const serverCertFile = path.join(__dirname, '../../fixtures/certs/server', 'server.crt');
const incorrectClientKeyFile = path.join(__dirname, '../../fixtures', 'agent1-cert.key');
const clientKeyFile = path.join(__dirname, '../../fixtures/certs/client', 'client.key');
const clientCertFile = path.join(__dirname, '../../fixtures/certs/client', 'client.crt');
const chainFile = path.join(__dirname, '../../fixtures/certs/chain', 'chain.pem');

describe('proxy policy', () => {
  let app, service;

  before('start service', () => {
    expressApp.all('*', function (req, res) {
      res.status(200).json({ port: port }).end();
    });

    service = https.createServer({
      key: fs.readFileSync(serverKeyFile),
      cert: fs.readFileSync(serverCertFile),
      ca: fs.readFileSync(chainFile),
      requestCert: true,
      rejectUnauthorized: true
    }, expressApp);

    service.listen(port);
  });

  after('clean up', () => {
    config.gatewayConfig = originalGatewayConfig;
    service.close();
  });

  describe('proxyOptions', () => {
    describe('when proxy options are specified on the serviceEndpoint', () => {
      before((done) => {
        setupGateway({
          target: {
            keyFile: clientKeyFile,
            certFile: clientCertFile,
            caFile: chainFile
          }
        }).then(apps => {
          app = apps.app;
          done();
        });
      });

      after(() => {
        app.close();
      });

      it('passes options to proxy', (done) => {
        request(app).get('/endpoint')
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function (error, res) {
            if (error) return done(error);

            assert.ok(res.body.port === port);
            done();
          });
      });
    });

    describe('When proxy options are specified on the policy action', () => {
      describe('and no proxy options are specified on the serviceEndpoint', () => {
        before((done) => {
          setupGateway({}, {
            target: {
              keyFile: clientKeyFile,
              certFile: clientCertFile,
              caFile: chainFile
            }
          }).then(apps => {
            app = apps.app;
            done();
          });
        });

        after(() => {
          app.close();
        });

        it('passes options to proxy', (done) => {
          request(app).get('/endpoint')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (error, res) {
              if (error) return done(error);

              assert.ok(res.body.port === port);
              done();
            });
        });
      });

      describe('and proxy options are also specified on the serviceEndpoint', () => {
        before((done) => {
          setupGateway({
            target: {
              keyFile: incorrectClientKeyFile
            }
          }, {
            target: {
              keyFile: clientKeyFile,
              certFile: clientCertFile,
              caFile: chainFile
            }
          }).then(apps => {
            app = apps.app;
            done();
          });
        });

        after(() => {
          app.close();
        });

        it('uses both configurations, with policy proxy options taking precedence', (done) => {
          request(app).get('/endpoint')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function (error, res) {
              if (error) return done(error);

              assert.ok(res.body.port === port);
              done();
            });
        });
      });
    });
  });
});

function setupGateway (serviceOptions = {}, policyOptions = {}) {
  config.gatewayConfig = {
    http: { port: 9091 },
    apiEndpoints: {
      test: {}
    },
    serviceEndpoints: {
      backend: {
        url: `https://localhost:${port}`,
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
}
