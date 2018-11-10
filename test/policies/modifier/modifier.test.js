const request = require('supertest');
const should = require('should');
const config = require('../../../lib/config');
const gateway = require('../../../lib/gateway');
const { findOpenPortNumbers } = require('../../common/server-helper');

const originalGatewayConfig = config.gatewayConfig;

let backendServerPort;

describe('@modifier policy', () => {
  let app, backendServer;

  before('start HTTP server', (done) => {
    findOpenPortNumbers(1).then((ports) => {
      const express = require('express');
      const expressApp = express();

      backendServerPort = ports[0];

      expressApp.all('*', express.json(), function (req, res) {
        if (req.header('r-test')) {
          res.setHeader('r-test', req.header('r-test'));
        }
        res.setHeader('x-test', 'hello');
        res.status(200).json(Object.assign({ url: req.url }, req.body));
      });

      backendServer = expressApp.listen(backendServerPort, done);
    });
  });

  describe('headers and responses modification', () => {
    before(() => {
      return setupGateway().then(apps => {
        app = apps.app;
      });
    });

    it('should correctly reshape the request and response', () => {
      return request(app).get('/').expect(res => {
        should(res.body).not.have.property('url');
        should(res.header).not.have.property('x-test');

        should(res.body).have.property('hello', 'world');
        should(res.header).have.property('r-test', 'baffino');
        should(res.header).have.property('res', 'correct');
      });
    });
  });

  after('clean up', (done) => {
    config.gatewayConfig = originalGatewayConfig;
    backendServer.close(done);
  });
});

const setupGateway = () => {
  config.gatewayConfig = {
    http: { port: 0 },
    apiEndpoints: {
      test: {}
    },
    serviceEndpoints: {
      backend: {
        url: `http://localhost:${backendServerPort}`
      }
    },
    policies: ['proxy', 'modifier'],
    pipelines: {
      pipeline1: {
        apiEndpoints: ['test'],
        policies: [
          {
            modifier: [{
              action: {
                request: {
                  headers: {
                    add: {
                      'r-test': '"baffino"'
                    }
                  }
                },
                response: {
                  body: {
                    add: {
                      hello: '"world"'
                    },
                    remove: ['url']
                  },
                  headers: {
                    add: {
                      res: '"correct"'
                    },
                    remove: ['x-test']
                  }
                }
              }
            }]
          }, {
            proxy: [{
              action: { serviceEndpoint: 'backend' }
            }]
          }]
      }
    }
  };
  return gateway();
};
