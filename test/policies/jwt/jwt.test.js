const idGen = require('uuid-base62');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const db = require('../../../lib/db');

const services = require('../../../lib/services');
const credentialService = services.credential;
const userService = services.user;

const serverHelper = require('../../common/server-helper');
const config = require('../../../lib/config');
const testHelper = require('../../common/routing.helper')();

const jwtSecret = 'superSecretString';

const originalGatewayConfig = config.gatewayConfig;

let gateway;
let backend;
let jwtCredential;

describe('JWT policy', () => {
  before('setup', () => {
    config.gatewayConfig = {
      http: {
        port: 0
      },
      serviceEndpoints: {
        backend: {
          url: 'http://localhost:6057'
        }
      },
      apiEndpoints: {
        api: {
          host: '*'
        }
      },
      policies: ['jwt', 'proxy'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['api'],
          policies: [{
            'jwt': {
              action: {
                secret: jwtSecret
              }
            }
          },
          {
            proxy: [
              {
                action: { serviceEndpoint: 'backend' }
              }
            ]
          }
          ]
        }
      }
    };

    return db.flushdb()
      .then(() => userService.insert({
        username: idGen.v4(),
        firstname: 'Vincenzo',
        lastname: 'Chianese',
        email: 'test@example.com'
      }))
      .then((user) => credentialService.insertCredential(user.id, 'jwt')).then((credential) => { jwtCredential = credential; })
      .then(() => serverHelper.generateBackendServer(6057)).then(({ app }) => { backend = app; })
      .then(() => testHelper.setup()).then(({ app }) => { gateway = app; });
  });

  after('cleanup', (done) => {
    config.gatewayConfig = originalGatewayConfig;
    backend.close(() => gateway.close(done));
  });

  [{
    description: 'should not forward requests without authorization header',
    statusCode: 401
  }, {
    description: 'should not forward requests with a unmatching signed JWT',
    signedJwt: () => jwt.sign({ iss: jwtCredential.keyId }, 'error'),
    statusCode: 401
  }, {
    description: 'should not forward requests with a signed JWT but wrong keyID',
    signedJwt: () => jwt.sign({ iss: 'I do not know' }, 'error'),
    statusCode: 401
  }, {
    description: 'should not forward requests with a signed JWT but wrong keyID',
    signedJwt: () => jwt.sign({ iss: 'I do not know' }, 'error'),
    statusCode: 401
  }, {
    description: 'should not forward requests with a signed JWT and correct keyID, but expired token',
    signedJwt: () => jwt.sign({ iss: jwtCredential.keyId, exp: (Date.now() / 1000) - 1000 }, jwtSecret),
    statusCode: 401
  }, {
    description: 'should not forward requests with a signed JWT and correct keyID, but not valid yet',
    signedJwt: () => jwt.sign({ iss: jwtCredential.keyId, nbf: (Date.now() / 1000) + 1000 }, jwtSecret),
    statusCode: 401
  }, {
    description: 'should forward requests with a signed JWT and correct keyID',
    signedJwt: () => jwt.sign({ iss: jwtCredential.keyId }, jwtSecret),
    statusCode: 200
  }, {
    description: 'should forward requests with a signed JWT and correct keyID, correct nbf and correct expiration',
    signedJwt: () => jwt.sign({ iss: jwtCredential.keyId, nbf: (Date.now() / 1000) - 1000, exp: (Date.now() / 1000) + 1000 }, jwtSecret),
    statusCode: 200
  }].forEach((testCase) => {
    it(testCase.description, () => {
      const req = request(gateway)
        .get('/')
        .expect(testCase.statusCode);

      if (testCase.signedJwt) {
        return req.set('Authorization', `Bearer ${testCase.signedJwt()}`);
      }

      return req;
    });
  });
});
