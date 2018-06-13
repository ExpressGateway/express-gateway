const request = require('supertest');
const express = require('express');
const should = require('should');
const sinon = require('sinon');
const serverHelper = require('../../common/server-helper');
const config = require('../../../lib/config');
const testHelper = require('../../common/routing.helper')();

const originalGatewayConfig = JSON.parse(JSON.stringify(config.gatewayConfig));
const originalSystemConfig = JSON.parse(JSON.stringify(config.systemConfig));

let gateway;
let introspectApp;
let backend;
let introspectEndpointSpy;

const gatewayConfig = (backendPort, introspectionPort) => ({
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
  policies: ['oauth2-introspect', 'proxy'],
  pipelines: {
    pipeline1: {
      apiEndpoints: ['authorizedEndpoint'],
      policies: [
        {
          'oauth2-introspect': {
            action: {
              endpoint: `http://localhost:${introspectionPort}/introspect`,
              authorization_value: 'YXBpMTpzZWNyZXQ='
            }
          }
        },
        { proxy: [{ action: { serviceEndpoint: 'backend' } }] }
      ]
    }
  }
});

describe('oAuth2 Introspection Policy', () => {
  before(() => {
    return serverHelper.findOpenPortNumbers(2)
      .then(([port, introspectionPort]) => {
        config.gatewayConfig = gatewayConfig(port, introspectionPort);
        const app = express();
        introspectEndpointSpy = sinon.spy((req, res) => {
          if (req.header('authorization') !== 'YXBpMTpzZWNyZXQ=') {
            return res.sendStatus(401);
          }

          if (req.body.token !== 'example_token_value') {
            return res.json({ active: false });
          }

          return res.json({ active: true });
        });
        app.post('/introspect', express.urlencoded({ extended: true }), introspectEndpointSpy);
        return new Promise((resolve, reject) => {
          introspectApp = app.listen(introspectionPort, (err) => {
            if (err) return reject(err);
            resolve();
          });
        }).then(() => serverHelper.generateBackendServer(port));
      }).then(({ app }) => { backend = app; })
      .then(() => testHelper.setup()).then(({ app }) => { gateway = app; });
  });

  it('should return 401 when invalid authorization value is provided', () =>
    request(gateway)
      .get('/')
      .expect(401)
  );

  it('should return 401 when invalid token is provided', () =>
    request(gateway)
      .get('/')
      .set('Authorization', `YXBpMTpzZWNyZXQ=`)
      .type('form')
      .send({ token: 'invalid' })
      .expect(401)
  );

  it('should return 200 when valid token and authvalue are provided', () =>
    request(gateway)
      .get('/')
      .set('Authorization', `YXBpMTpzZWNyZXQ=`)
      .type('form')
      .send({ token: 'example_token_value' })
      .expect(200)
  );

  it('should not call the introspection endpoint again because the token is valid already', () =>
    request(gateway)
      .get('/')
      .set('Authorization', `YXBpMTpzZWNyZXQ=`)
      .type('form')
      .send({ token: 'example_token_value' })
      .then(() => should(introspectEndpointSpy.callCount).equal(3))
  );

  after('cleanup', (done) => {
    config.systemConfig = originalSystemConfig;
    config.gatewayConfig = originalGatewayConfig;
    backend.close(() => gateway.close(() => introspectApp.close(done)));
  });
});
