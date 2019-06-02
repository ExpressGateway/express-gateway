const path = require('path');
const fs = require('fs');
const request = require('supertest');
const should = require('should');
const sinon = require('sinon');

const config = require('../../../lib/config');
const gateway = require('../../../lib/gateway');
const logger = require('../../../lib/logger').policy;
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

      expressApp.all('*', express.json(), function (req, res) {
        if (req.headers['x-test']) {
          res.setHeader('x-test', req.header('x-test'));
        }

        if (req.headers['x-forwarded-for']) {
          res.setHeader('x-forwarded-for', req.header('x-forwarded-for'));
        }

        res.status(200).json(Object.assign({ url: req.url }, req.body));
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
    afterEach((done) => app ? app.close(done) : done());

    it('raises an error when incorrect TLS file paths are provided', () => {
      const serviceOptions = { target: { keyFile: '/non/existent/file.key' } };

      return should(setupGateway(serviceOptions)).rejectedWith(/no such file or directory/);
    });

    describe('when incorrect proxy options are provided', () => {
      before(() => {
        return setupGateway({ target: { certFile: invalidClientCertFile } }).then(apps => {
          app = apps.app;
        });
      });

      it('responds with a bad gateway error', () => expectResponse(app, 502, /text\/html/));
    });

    describe('When proxy options are specified on the policy action', () => {
      before(() => {
        return setupGateway(defaultProxyOptions).then(apps => {
          app = apps.app;
        });
      });

      it('passes options to proxy', () => expectResponse(app, 200, /json/));
    });

    describe('if there is no matching route', () => {
      before(() => {
        return setupGateway(defaultProxyOptions).then(apps => {
          app = apps.app;
        });
      });

      it('returns 404', () => request(app).get('/hahaha').expect(404));
    });

    describe('When proxy options are specified on the proxyOptions deprecated parameter', () => {
      let loggerSpy;
      before(() => {
        loggerSpy = sinon.spy(logger, 'warn');
        return setupGateway({ proxyOptions: defaultProxyOptions }).then(apps => {
          app = apps.app;
        });
      });

      after(() => loggerSpy.restore());

      it('passes options to proxy but emit a warning', () => {
        expectResponse(app, 200, /json/);
        should(loggerSpy.called).be.true();
      });
    });

    describe('When proxy options are specified on the serviceEndpoint', () => {
      before(() => {
        return setupGateway(undefined, defaultProxyOptions).then(apps => {
          app = apps.app;
        });
      });

      it('passes options to proxy', () => expectResponse(app, 200, /json/));
    });

    describe('When proxy options are scattered on all the supported properties', () => {
      before(() => {
        return setupGateway(Object.assign(defaultProxyOptions, { proxyOptions: { xfwd: true } }), { headers: { 'X-Test': 'testValue' } }).then(apps => {
          app = apps.app;
        });
      });

      it('passes options to proxy', () =>
        request(app)
          .get('/endpoint')
          .expect(200)
          .expect('x-test', 'testValue')
          .expect('x-forwarded-for', '::ffff:127.0.0.1')
      );
    });
  });

  describe('When proxy does not have the serviceEndpoint', () => {
    before(() => {
      return setupGateway(Object.assign(defaultProxyOptions, { serviceEndpoint: null })).then(apps => {
        app = apps.app;
      });
    });

    it('should return 502', () =>
      request(app)
        .get('/endpoint')
        .expect(502)
    );
  });

  describe('requestStream property', () => {
    before(() => {
      return gateway({
        plugins: {
          policies: [{
            name: 'change-stream',
            policy: () => {
              const s = new (require('stream').Readable)();
              const payload = JSON.stringify({ payload: 'value1', testField: 'value2' });
              s.push(payload);
              s.push(null);
              return (req, res, next) => {
                req.egContext.requestStream = s;
                req.headers['content-length'] = Buffer.byteLength(payload);
                next();
              };
            }
          }]
        },
        config: {
          gatewayConfig: {
            http: { port: 0 },
            apiEndpoints: {
              test: {}
            },
            serviceEndpoints: {
              backend: {
                url: `https://localhost:${backendServerPort}`
              }
            },
            policies: ['proxy', 'change-stream'],
            pipelines: {
              pipeline1: {
                apiEndpoints: ['test'],
                policies: [{
                  'change-stream': {}
                }, {
                  proxy: [{
                    action: Object.assign({}, defaultProxyOptions, { serviceEndpoint: 'backend' })
                  }]
                }]
              }
            }
          }
        }
      }).then(apps => { app = apps.app; });
    });

    it('should return a different body when requestStream is set', () =>
      request(app)
        .get('/endpoint')
        .type('json')
        .send({ testValue: 'testBody' })
        .expect(200, { payload: 'value1', testField: 'value2', url: '/endpoint' })
    );
  });

  describe('strip Path capabilities', () => {
    before(() => {
      return gateway({
        config: {
          gatewayConfig: {
            http: { port: 0 },
            apiEndpoints: {
              testStar: { path: '/hello/v1/api/endpointStar*' },
              test: { path: '/hello/v1/api/endpoint' }
            },
            serviceEndpoints: {
              backend: {
                url: `https://localhost:${backendServerPort}`
              }
            },
            policies: ['proxy'],
            pipelines: {
              pipeline1: {
                apiEndpoints: ['testStar'],
                policies: [{
                  proxy: [{
                    action: Object.assign({ stripPath: true }, defaultProxyOptions, { serviceEndpoint: 'backend' })
                  }]
                }]
              },
              pipeline2: {
                apiEndpoints: ['test'],
                policies: [{
                  proxy: [{
                    action: Object.assign({ stripPath: true }, defaultProxyOptions, { serviceEndpoint: 'backend' })
                  }]
                }]
              }

            }
          }
        }
      }).then(apps => { app = apps.app; });
    });

    it('should be proxied with all the query parameters when hitting a star path', () =>
      request(app)
        .get('/hello/v1/api/endpointStar/something')
        .query({ a: 2, b: 3, c: 10 })
        .type('json')
        .expect(200, { url: '/something?a=2&b=3&c=10' })
    );

    it('should be proxied with all the query parameters when hitting a normal path', () =>
      request(app)
        .get('/hello/v1/api/endpoint')
        .query({ a: 2, b: 3, c: 10 })
        .type('json')
        .expect(200, { url: '/?a=2&b=3&c=10' })
    );
  });
});

const setupGateway = (proxyOptions = {}, serviceProxyOptions = {}) => {
  config.gatewayConfig = {
    http: { port: 0 },
    apiEndpoints: {
      test: {
        paths: ['/endpoint']
      }
    },
    serviceEndpoints: {
      backend: {
        url: `https://localhost:${backendServerPort}`,
        proxyOptions: serviceProxyOptions
      }
    },
    policies: ['proxy'],
    pipelines: {
      pipeline1: {
        apiEndpoints: ['test'],
        policies: [{
          proxy: [{
            action: Object.assign({ serviceEndpoint: 'backend' }, proxyOptions)
          }]
        }]
      }
    }
  };
  return gateway();
};

const expectResponse = (app, status, contentType) =>
  request(app).get('/endpoint').expect(status).expect('Content-Type', contentType);
