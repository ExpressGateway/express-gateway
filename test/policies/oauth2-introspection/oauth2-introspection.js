const request = require('supertest');
const express = require('express');
const serverHelper = require('../../common/server-helper');
const config = require('../../../lib/config');
const testHelper = require('../../common/routing.helper')();

const originalGatewayConfig = JSON.parse(JSON.stringify(config.gatewayConfig));
const originalSystemConfig = JSON.parse(JSON.stringify(config.systemConfig));

let gateway;
let introspectApp;
let backend;

const gatewayConfig = (port) => ({
  http: { port: 0 },
  serviceEndpoints: {
    backend: {
      url: `http://localhost:${port}`
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
              endpoint: 'http://localhost:7777/introspect',
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
      .then(([port, introspectPort]) => {
        config.gatewayConfig = gatewayConfig(port);
        const app = express();
        app.post('/introspect', express.urlencoded({ extended: true }), (req, res) => {
          if (req.header('authorization') !== 'YXBpMTpzZWNyZXQ=') {
            return res.sendStatus(401);
          }

          if (req.body.token !== 'example_token_value') {
            return res.json({ active: false });
          }

          return res.json({ active: true });
        });
        return new Promise((resolve, reject) => {
          introspectApp = app.listen(7777, (err) => {
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

  after('cleanup', (done) => {
    config.systemConfig = originalSystemConfig;
    config.gatewayConfig = originalGatewayConfig;
    backend.close(() => gateway.close(() => introspectApp.close(done)));
  });
});
