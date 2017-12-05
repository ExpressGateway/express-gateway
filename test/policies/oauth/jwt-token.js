const idGen = require('uuid-base62');
const request = require('supertest');
const should = require('should');
const jwt = require('jsonwebtoken');

const db = require('../../../lib/db');

const services = require('../../../lib/services');
const credentialService = services.credential;
const userService = services.user;
const appService = services.application;

const serverHelper = require('../../common/server-helper');
const config = require('../../../lib/config');
const testHelper = require('../../common/routing.helper')();

const originalGatewayConfig = JSON.parse(JSON.stringify(config.gatewayConfig));
const originalSystemConfig = JSON.parse(JSON.stringify(config.systemConfig));

let gateway;
let backend;
let jwtToken;

const appCredential = {
  secret: idGen.v4()
};

const gatewayConfig = (port) => ({
  http: { port: 0 },
  serviceEndpoints: {
    backend: {
      url: `http://localhost:${port}`
    }
  },
  apiEndpoints: {
    authorizedEndpoint: {
      host: '*',
      paths: ['/authorizedPath']
    }
  },
  policies: ['oauth2', 'proxy'],
  pipelines: {
    pipeline1: {
      apiEndpoints: ['authorizedEndpoint'],
      policies: [
        {
          oauth2: {
            action: {
              jwt: {
                issuer: 'express-gateway',
                audience: 'something',
                subject: 'somebody',
                secretOrPublicKey: 'ssssst',
                checkCredentialExistence: false
              }
            }
          }
        },
        { proxy: [{ action: { serviceEndpoint: 'backend' } }] }
      ]
    }
  }
});

describe('oAuth2 policy', () => {
  describe('Issues a JWT token when configured', () => {
    before(() => {
      return db.flushdb()
        .then(() => userService.insert({
          username: idGen.v4(),
          firstname: 'Clark',
          lastname: 'Kent',
          email: 'test@example.com'
        }))
        .then((user) => appService.insert({ name: 'appy', 'redirectUri': 'http://haha.com' }, user.id))
        .then((app) => credentialService.insertCredential(app.id, 'oauth2', appCredential))
        .then(credential => Object.assign(appCredential, credential))
        .then(() => serverHelper.findOpenPortNumbers(1))
        .then(([port]) => {
          config.systemConfig.accessTokens.tokenType = 'jwt';
          config.systemConfig.accessTokens.issuer = 'express-gateway';
          config.systemConfig.accessTokens.audience = 'something';
          config.systemConfig.accessTokens.subject = 'somebody';
          config.systemConfig.accessTokens.secretOrPrivateKey = 'ssssst';
          config.gatewayConfig = gatewayConfig(port);
          return serverHelper.generateBackendServer(port);
        }).then(({ app }) => { backend = app; })
        .then(() => testHelper.setup()).then(({ app }) => { gateway = app; });
    });

    it('shuold return a JWT token', () => request(gateway)
      .post('/oauth2/token')
      .send({
        grant_type: 'client_credentials',
        client_id: appCredential.id,
        client_secret: appCredential.secret
      }).expect(200)
      .then((response) => {
        should(response.body).have.property('token_type', 'Bearer');
        should(response.body).have.property('access_token');
        should(jwt.verify(response.body.access_token, config.systemConfig.accessTokens.secretOrPrivateKey,
          { audience: config.systemConfig.accessTokens.audience, issuer: config.systemConfig.accessTokens.issuer }))
          .be.Object();

        jwtToken = response.body.access_token;
      })
    );

    it('should let me access the authenticated resource using the JWT token', () =>
      request(gateway)
        .get('/authorizedPath')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)

    );

    after('cleanup', (done) => {
      config.systemConfig = originalSystemConfig;
      config.gatewayConfig = originalGatewayConfig;
      backend.close(() => gateway.close(done));
    });
  });
});
