const headerName = 'Authorization';
const idGen = require('uuid62');
const request = require('supertest');
const should = require('should');

const services = require('../../../lib/services');
const credentialService = services.credential;
const userService = services.user;
const serverHelper = require('../../common/server-helper');
const db = require('../../../lib/db');
const testHelper = require('../../common/routing.helper');
const config = require('../../../lib/config');
const originalGatewayConfig = config.gatewayConfig;
let dbuser1;
describe('Functional Tests keyAuth Policy', () => {
  const helper = testHelper();
  helper.addPolicy('test', () => (req, res) => {
    res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
  });

  let user, app;
  const proxyPolicy = {
    proxy: { action: { serviceEndpoint: 'backend' } }
  };
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
        authorizedEndpoint: {
          host: '*',
          paths: ['/authorizedPath'],
          scopes: 'authorizedScope' // #434 should allow string not only array
        },
        onlyQueryParamEndpoint: {
          host: '*',
          paths: ['/by_query']
        },
        unauthorizedEndpoint: {
          host: '*',
          paths: ['/unauthorizedPath'],
          scopes: ['unauthorizedScope'] // #434 should accept array
        }
      },
      policies: ['key-auth', 'proxy'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['authorizedEndpoint'],
          policies: [{
            'key-auth': {
              action: {
                apiKeyHeader: 'TEST_HEADER',
                apiKeyHeaderScheme: 'SCHEME1'
              }
            }
          },
          proxyPolicy
          ]
        },
        pipeline2: {
          apiEndpoints: ['unauthorizedEndpoint'],
          policies: [{
            'key-auth': [{
              action: {
                name: 'keyauth'
              }
            }]
          },
          proxyPolicy
          ]
        },
        pipeline_by_query: {
          apiEndpoints: ['onlyQueryParamEndpoint'],
          policies: [{
            'key-auth': [{
              action: {
                name: 'keyauth',
                apiKeyField: 'customApiKeyParam'
              }
            }]
          },
          proxyPolicy
          ]
        }
      }
    };

    return db.flushdb()
      .then(function () {
        const user1 = {
          username: idGen.v4(),
          firstname: 't',
          lastname: 't',
          email: 'test@example.com'
        };

        return userService.insert(user1);
      })
      .then(u => {
        dbuser1 = u;
        return credentialService.insertScopes(['authorizedScope', 'unauthorizedScope']);
      })
      .then(() => {
        return credentialService.insertCredential(dbuser1.id, 'key-auth', {
          scopes: ['authorizedScope']
        });
      })
      .then((userRes) => {
        should.exist(userRes);
        user = userRes;
        return serverHelper.generateBackendServer(6057);
      })
      .then(() => {
        return helper.setup();
      })
      .then(apps => {
        app = apps.app;
      });
  });

  after('cleanup', () => {
    config.gatewayConfig = originalGatewayConfig;
    return helper.cleanup();
  });

  it('should not authenticate key for requests without authorization header', function (done) {
    request(app)
      .get('/authorizedPath')
      .expect(401)
      .end(function (err) {
        should.not.exist(err);
        done();
      });
  });

  it('should not authorise key for requests if requester doesn\'t have authorized scopes', function (done) {
    const apikey = 'apiKey ' + user.keyId + ':' + user.keySecret;

    request(app)
      .get('/unauthorizedPath')
      .set(headerName, apikey)
      .expect(403)
      .end(function (err) {
        done(err);
      });
  });

  it('should authenticate key with scheme in headers for requests with scopes if requester is authorized', function (done) {
    const apikey = 'SCHEME1 ' + user.keyId + ':' + user.keySecret;

    request(app)
      .get('/authorizedPath')
      .set('TEST_HEADER', apikey)
      .expect(200)
      .end(done);
  });
  it('should authenticate key with scheme ignoring case in headers for requests with scopes if requester is authorized', function (done) {
    const apikey = 'scheME1 ' + user.keyId + ':' + user.keySecret;

    request(app)
      .get('/authorizedPath')
      .set('TEST_HEADER', apikey)
      .expect(200)
      .end(done);
  });
  it('should authenticate key in query for requests with scopes if requester is authorized ', function (done) {
    const apikey = user.keyId + ':' + user.keySecret;

    request(app)
      .get('/authorizedPath?apiKey=' + apikey)
      .expect(200)
      .end(done);
  });

  it('should not authorize invalid key', function (done) {
    const apikey = 'apiKey test:wrong';

    request(app)
      .get('/authorizedPath')
      .set(headerName, apikey)
      .expect(401)
      .end(done);
  });

  it('should authenticate key in query if endpoint allows only query ', function (done) {
    const apikey = user.keyId + ':' + user.keySecret;

    request(app)
      .get('/by_query?customApiKeyParam=' + apikey)
      .expect(200)
      .end(done);
  });
});
