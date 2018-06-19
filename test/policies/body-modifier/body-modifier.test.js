const request = require('supertest');
const express = require('express');
const should = require('should');
const serverHelper = require('../../common/server-helper');
const config = require('../../../lib/config');
const testHelper = require('../../common/routing.helper')();

const originalGatewayConfig = JSON.parse(JSON.stringify(config.gatewayConfig));
const originalSystemConfig = JSON.parse(JSON.stringify(config.systemConfig));

let gateway;
let introspectApp;

const gatewayConfig = (backendPort) => ({
  http: { port: 0 },
  serviceEndpoints: {
    backend: {
      url: `http://localhost:${backendPort}`
    }
  },
  apiEndpoints: {
    authorizedEndpoint: {
      host: '*'
    }
  },
  policies: ['body-modifier', 'proxy'],
  pipelines: {
    pipeline1: {
      apiEndpoints: ['authorizedEndpoint'],
      policies: [
        {
          'body-modifier': {
            action: {
              request: {
                add: [
                  {
                    name: 'fullname',
                    value: 'req.body.name + \' \' + req.body.surname'
                  }
                ],
                remove: ['name', 'surname']
              },
              response: {
                add: [
                  {
                    name: 'createdBy',
                    value: '\'Clark Kent\''
                  }
                ],
                remove: ['uselessParam']
              }
            }
          }
        },
        { proxy: [{ action: { serviceEndpoint: 'backend' } }] }
      ]
    }
  }
});

describe('body modifier Policy', () => {
  before(() => {
    return serverHelper.findOpenPortNumbers(2)
      .then(([port, backendPort]) => {
        config.gatewayConfig = gatewayConfig(backendPort);
        const app = express();

        app.post('*', express.json(), (req, res) => {
          should(req.body).have.property('fullname');
          should(req.body).not.have.properties(['name', 'surname']);
          res.json({ customerId: 123456789, uselessParam: 10 });
        });

        return new Promise((resolve, reject) => {
          introspectApp = app.listen(backendPort, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      })
      .then(() => testHelper.setup()).then(({ app }) => { gateway = app; });
  });

  it('should remove some properties and add some others', () =>
    request(gateway)
      .post('/')
      .send({ name: 'Clark', surname: 'Kent' })
      .expect(200, {
        customerId: '123456789',
        createdBy: 'Clark Kent'
      })
  );

  after('cleanup', (done) => {
    config.systemConfig = originalSystemConfig;
    config.gatewayConfig = originalGatewayConfig;
    gateway.close(() => introspectApp.close(done));
  });
});
