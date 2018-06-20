const idGen = require('uuid62');
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

const appCredential = {
  secret: idGen.v4()
};

const userCred = {};

const jwtTokenChecks = (response) => {
  let decodedjwt;
  it('shuold return a token with type \'Bearer\'', () => {
    should(response()).have.property('token_type', 'Bearer');
    should(response()).have.property('access_token');
  });

  it('should be correctly decoded as a JWT', () => {
    decodedjwt = jwt.verify(response().access_token, config.systemConfig.accessTokens.secretOrPrivateKey,
      { audience: config.systemConfig.accessTokens.audience, issuer: config.systemConfig.accessTokens.issuer });
    should(decodedjwt).be.Object();
  });

  it('should contain consumer id and scopes', () => {
    should(decodedjwt).have.properties(['consumerId', 'scopes']);
    should(decodedjwt).property('scopes').eql(['read', 'write']);
  });
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
        .then(() => credentialService.insertScopes(['read', 'write']))
        .then(() => userService.insert({
          username: idGen.v4(),
          firstname: 'Clark',
          lastname: 'Kent',
          email: 'test@example.com'
        }))
        .then(user => credentialService.insertCredential(user.id, 'basic-auth', {}).then(cred => { Object.assign(userCred, { password: cred.password, username: user.username }); return user; }))
        .then(user => appService.insert({ name: 'appy', 'redirectUri': 'http://haha.com' }, user.id))
        .then(app => credentialService.insertCredential(app.id, 'oauth2', appCredential))
        .then(credential => credentialService.addScopesToCredential(credential.id, 'oauth2', ['read', 'write']).then(() => credential))
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

    let _response;

    before(() => request(gateway)
      .post('/oauth2/token')
      .type('form')
      .send({
        grant_type: 'password',
        client_id: appCredential.id,
        client_secret: appCredential.secret,
        username: userCred.username,
        password: userCred.password,
        scope: ['read', 'write'].join(' ')
      }).expect(200).then((response) => { _response = response.body; }));

    jwtTokenChecks(() => _response);

    it('should include a refresh token', () => {
      should(_response).have.property('refresh_token');
    });

    it('should let me access the authenticated resource using the JWT token', () =>
      request(gateway)
        .get('/authorizedPath')
        .set('Authorization', `Bearer ${_response.access_token}`)
        .expect(200)
    );

    describe('should let me get a new token using the provided refresh token', () => {
      before(() => request(gateway)
        .post('/oauth2/token')
        .type('form')
        .send({
          grant_type: 'refresh_token',
          client_id: appCredential.id,
          client_secret: appCredential.secret,
          refresh_token: _response.refresh_token
        }).expect(200).then((response) => { _response = response.body; })
      );

      jwtTokenChecks(() => _response);
    });

    after('cleanup', (done) => {
      config.systemConfig = originalSystemConfig;
      config.gatewayConfig = originalGatewayConfig;
      backend.close(() => gateway.close(done));
    });
  });
});
