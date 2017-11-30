const idGen = require('uuid-base62');
const fs = require('fs');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const db = require('../../../lib/db');

const services = require('../../../lib/services');
const credentialService = services.credential;
const userService = services.user;

const serverHelper = require('../../common/server-helper');
const config = require('../../../lib/config');
const testHelper = require('../../common/routing.helper')();

const originalGatewayConfig = config.gatewayConfig;

let gateway;
let backend;
let jwtCredential;

describe('JWT policy', () => {
  [{
    description: 'Secret string',
    jwtSecret: 'superSecretString',
    jwtSignOptions: {},
    actionConfig: {
      secretOrPubKey: 'superSecretString'
    }
  }, {
    description: 'Secret file',
    jwtSecret: fs.readFileSync(require.resolve('../../fixtures/certs/client/client.key')),
    jwtSignOptions: {
      algorithm: 'RS256'
    },
    actionConfig: {
      secretOrPubKeyFile: require.resolve('../../fixtures/certs/client/client.crt'),
      jwtExtractor: 'query',
      jwtExtractorField: 'jwtKey'
    }
  }].forEach((jwtSecretTestCase) => {
    describe(jwtSecretTestCase.description, () => {
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
                  action: jwtSecretTestCase.actionConfig
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
            firstname: 'Clark',
            lastname: 'Kent',
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
        signedJwt: () => jwt.sign({ sub: jwtCredential.keyId }, 'error'),
        statusCode: 401
      }, {
        description: 'should not forward requests when no issuer is provided',
        signedJwt: () => jwt.sign({}, jwtSecretTestCase.jwtSecret, jwtSecretTestCase.jwtSignOptions
        ),

        statusCode: 401
      }, {
        description: 'should not forward requests with a unmatching signed JWT',
        signedJwt: () => jwt.sign({ sub: jwtCredential.keyId }, 'error'),
        statusCode: 401
      }, {
        description: 'should not forward requests with a signed JWT but wrong keyID',
        signedJwt: () => jwt.sign({ sub: 'I do not know' }, 'error'),
        statusCode: 401
      }, {
        description: 'should not forward requests with a signed JWT but wrong keyID',
        signedJwt: () => jwt.sign({ sub: 'I do not know' }, 'error'),
        statusCode: 401
      }, {
        description: 'should not forward requests with a signed JWT and correct keyID, but expired token',
        signedJwt: () => jwt.sign(
          { sub: jwtCredential.keyId, exp: (Date.now() / 1000) - 1000 },
          jwtSecretTestCase.jwtSecret,
          jwtSecretTestCase.jwtSignOptions
        ),
        statusCode: 401
      }, {
        description: 'should not forward requests with a signed JWT and correct keyID, but not valid yet',
        signedJwt: () => jwt.sign(
          { sub: jwtCredential.keyId, nbf: (Date.now() / 1000) + 1000 },
          jwtSecretTestCase.jwtSecret,
          jwtSecretTestCase.jwtSignOptions
        ),
        statusCode: 401
      }, {
        description: 'should forward requests with a signed JWT and correct keyID',
        signedJwt: () => jwt.sign(
          { sub: jwtCredential.keyId },
          jwtSecretTestCase.jwtSecret,
          jwtSecretTestCase.jwtSignOptions
        ),
        statusCode: 200
      }, {
        description: 'should forward requests with a signed JWT and correct keyID, correct nbf and correct expiration',
        signedJwt: () => jwt.sign(
          { sub: jwtCredential.keyId, nbf: (Date.now() / 1000) - 1000, exp: (Date.now() / 1000) + 1000 },
          jwtSecretTestCase.jwtSecret,
          jwtSecretTestCase.jwtSignOptions
        ),
        statusCode: 200
      }].forEach((testCase) => {
        it(testCase.description, () => {
          const req = request(gateway)
            .get('/')
            .expect(testCase.statusCode);

          if (testCase.signedJwt) {
            if (jwtSecretTestCase.actionConfig.jwtExtractor === 'query') {
              const query = {};
              query[jwtSecretTestCase.actionConfig.jwtExtractorField] = testCase.signedJwt();
              return req.query(query);
            } else {
              return req.set('Authorization', `Bearer ${testCase.signedJwt()}`);
            }
          }

          return req;
        });
      });
    });
  });
});
