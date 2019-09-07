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
      host: '*',
      scopes: ['read', 'write']
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

        const returnToken = sinon
          .stub()
          .onFirstCall().callsFake(res => {
            res.json({ active: true });
          })
          .callsFake(res => {
            res.json({ active: true, scopes: 'read write' });
          });

        introspectEndpointSpy = sinon.spy((req, res) => {
          if (req.header('authorization') !== 'YXBpMTpzZWNyZXQ=') {
            return res.sendStatus(401);
          }

          if (!['token_value_1', 'token_value_2'].includes(req.body.token)) {
            return res.json({ active: false });
          }

          returnToken(res);
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

  it('should return 401 when no token is provided', () =>
    request(gateway)
      .get('/')
      .expect(401)
  );

  it('should return 401 when an invalid token is sent', () =>
    request(gateway)
      .get('/')
      .set('Authorization', 'Bearer nasino')
      .expect(401)
  );

  it('should return 401 when a valid token is sent, but not sufficient scopes', () =>
    request(gateway)
      .get('/')
      .set('Authorization', 'Bearer token_value_1')
      .expect(401)
  );

  it('should return 200 when valid token and sufficient scopes are provided', () =>
    request(gateway)
      .get('/')
      .set('Authorization', 'Bearer token_value_2')
      .expect(200)
  );

  it('should not call the introspection endpoint again because the token is valid already', () =>
    request(gateway)
      .get('/')
      .set('Authorization', 'Bearer token_value_2')
      .expect(200)
      .then(() => should(introspectEndpointSpy.callCount).equal(3))
  );

  it('should call the introspection endpoint again because a different token is sent', () =>
    request(gateway)
      .get('/')
      .set('Authorization', 'Bearer hola')
      .expect(401)
      .then(() => should(introspectEndpointSpy.callCount).equal(4))
  );

  after('cleanup', (done) => {
    config.systemConfig = originalSystemConfig;
    config.gatewayConfig = originalGatewayConfig;
    backend.close(() => gateway.close(() => introspectApp.close(done)));
  });
});
