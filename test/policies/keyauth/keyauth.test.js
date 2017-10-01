let mock = require('mock-require');
mock('redis', require('fakeredis'));
const headerName = 'Authorization';

let request = require('supertest');
let should = require('should');

let services = require('../../../lib/services');
let credentialService = services.credential;
let userService = services.user;
let serverHelper = require('../../common/server-helper');
let db = require('../../../lib/db')();
let testHelper = require('../../common/routing.helper');
let config = require('../../../lib/config');
let originalGatewayConfig = config.gatewayConfig;

describe('Functional Tests keyAuth Policy', () => {
  let helper = testHelper();
  helper.addPolicy('test', () => (req, res) => {
    res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
  });

  let user, app;
  let proxyPolicy = {
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
          scopes: ['authorizedScope']
        },
        onlyQueryParamEndpoint: {
          host: '*',
          paths: ['/by_query']
        },
        unauthorizedEndpoint: {
          host: '*',
          paths: ['/unauthorizedPath'],
          scopes: ['unauthorizedScope']
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
                apiKeyField: 'customApiKeyParam',
                disableHeaders: true
              }
            }]
          },
            proxyPolicy
          ]
        }
      }
    };

    return db.flushdbAsync()
      .then(function () {
        let user1 = {
          username: 'test',
          firstname: 't',
          lastname: 't',
          email: 'test@example.com'
        };

        return userService.insert(user1)
          .then(_fromDbUser1 => {
            should.exist(_fromDbUser1);

            return credentialService.insertScopes('authorizedScope', 'unauthorizedScope')
              .then(() => {
                return credentialService.insertCredential(_fromDbUser1.username, 'key-auth', {
                  scopes: ['authorizedScope']
                });
              })
              .then((userRes) => {
                should.exist(userRes);
                user = userRes;
                return serverHelper.generateBackendServer(6057);
              }).then(() => {
                helper.setup()
                  .then(apps => {
                    app = apps.app;
                  });
              });
          });
      });
  });

  after('cleanup', (done) => {
    app.close();
    config.gatewayConfig = originalGatewayConfig;
    helper.cleanup();
    done();
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
    let apikey = 'apiKey ' + user.keyId + ':' + user.keySecret;

    request(app)
      .get('/unauthorizedPath')
      .set(headerName, apikey)
      .expect(403)
      .end(function (err) {
        done(err);
      });
  });

  it('should authenticate key with scheme in headers for requests with scopes if requester is authorized', function (done) {
    let apikey = 'SCHEME1 ' + user.keyId + ':' + user.keySecret;

    request(app)
      .get('/authorizedPath')
      .set('TEST_HEADER', apikey)
      .expect(200)
      .end(done);
  });
  it('should authenticate key with scheme ignoring case in headers for requests with scopes if requester is authorized', function (done) {
    let apikey = 'scheME1 ' + user.keyId + ':' + user.keySecret;

    request(app)
      .get('/authorizedPath')
      .set('TEST_HEADER', apikey)
      .expect(200)
      .end(done);
  });
  it('should authenticate key in query for requests with scopes if requester is authorized ', function (done) {
    let apikey = user.keyId + ':' + user.keySecret;

    request(app)
      .get('/authorizedPath?apiKey=' + apikey)
      .expect(200)
      .end(done);
  });

  it('should not authorize invalid key', function (done) {
    let apikey = 'apiKey test:wrong';

    request(app)
      .get('/authorizedPath')
      .set(headerName, apikey)
      .expect(401)
      .end(done);
  });

  it('should authenticate key in query if endpoint allows only query ', function (done) {
    let apikey = user.keyId + ':' + user.keySecret;

    request(app)
      .get('/by_query?customApiKeyParam=' + apikey)
      .expect(200)
      .end(done);
  });
  it('should not authenticate with header of EP allows only query', function (done) {
    let apikey = 'apiKey ' + user.keyId + ':' + user.keySecret;

    request(app)
      .get('/by_query')
      .set(headerName, apikey)
      .expect(401)
      .end(function (err) {
        done(err);
      });
  });
});
