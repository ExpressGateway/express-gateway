const path = require('path');
const fs = require('fs');
const request = require('supertest');
const should = require('should');

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

describe('@proxy policy', () => {
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
    it('raises an error when incorrect TLS file paths are provided', () => {
      const serviceOptions = { target: { keyFile: '/non/existent/file.key' } };

      return should(setupGateway(serviceOptions)).be.rejectedWith('ENOENT: no such file or directory, open \'/non/existent/file.key\'');
    });

    describe('when incorrect proxy options are provided', () => {
      before(() => {
        return setupGateway({ target: { certFile: invalidClientCertFile } }).then(apps => {
          app = apps.app;
        });
      });

      after((done) => app.close(done));

      it('responds with a bad gateway error', () => expectResponse(app, 502, /text\/html/));
    });

    describe('When proxy options are specified on the policy action', () => {
      before(() => {
        return setupGateway(defaultProxyOptions).then(apps => {
          app = apps.app;
        });
      });

      after((done) => {
        app.close(done);
      });

      it('passes options to proxy', () => expectResponse(app, 200, /json/));
    });
  });
});

const setupGateway = (proxyOptions) =>
  findOpenPortNumbers(1).then(([port]) => {
    config.gatewayConfig = {
      http: { port },
      apiEndpoints: {
        test: {}
      },
      serviceEndpoints: {
        backend: {
          url: `https://localhost:${backendServerPort}`
        }
      },
      policies: ['proxy'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: [{
            proxy: [{
              action: { proxyOptions, serviceEndpoint: 'backend' }
            }]
          }]
        }
      }
    };

    return gateway();
  });

const expectResponse = (app, status, contentType) =>
  request(app).get('/endpoint').expect(status).expect('Content-Type', contentType);
