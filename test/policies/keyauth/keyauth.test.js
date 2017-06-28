let mock = require('mock-require');
mock('redis', require('fakeredis'));
const headerName = 'authorization';

let request = require('supertest');
let should = require('should');

let services = require('../../../lib/services');
let credentialService = services.credential;
let userService = services.user;
let serverHelper = require('../../common/server-helper');
let db = require('../../../lib/db')();
let testHelper = require('../../routing/routing.helper');
let config = require('../../../lib/config');
let originalGatewayConfig = config.gatewayConfig;
describe('Functional Tests keyAuth Policy', () => {
  let helper = testHelper();
  let user, app;

  before('setup', () => {
    config.gatewayConfig = {
      http: {
        port: 9089
      },
      serviceEndpoints: {
        backend: {
          url: 'http://localhost:6056'
        }
      },
      apiEndpoints: {
        authorizedEndpoint: {
          host: '*',
          paths: ['/authorizedPath'],
          scopes: [{
            scope: 'authorizedScope',
            verbs: '*'
          }]
        },
        unauthorizedEndpoint: {
          host: '*',
          paths: ['/unauthorizedPath'],
          scopes: [{
            scope: 'unauthorizedScope',
            verbs: '*'
          }]
        }
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['authorizedEndpoint'],
          policies: [{
            keyauth: [{
              action: {
                name: 'keyauth'
              }
            }]
          },
          {
            proxy: [{
              action: {
                name: 'proxy',
                serviceEndpoint: 'backend'
              }
            }]
          }
          ]
        },
        pipeline2: {
          apiEndpoints: ['unauthorizedEndpoint'],
          policies: [{
            keyauth: [{
              action: {
                name: 'keyauth'
              }
            }]
          },
          {
            proxy: [{
              action: {
                name: 'proxy',
                serviceEndpoint: 'backend'
              }
            }]
          }
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
                return serverHelper.generateBackendServer(6056);
              }).then(() => {
                helper.setup()()
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
    let apikey = user.keyId + ':' + user.keySecret;

    request(app)
      .get('/unauthorizedPath')
      .set(headerName, apikey)
      .expect(403)
      .end(function (err) {
        should.not.exist(err);
        done();
      });
  });

  it('should authenticate key in headers for requests with scopes if requester is authorized', function (done) {
    let apikey = user.keyId + ':' + user.keySecret;

    request(app)
      .get('/authorizedPath')
      .set(headerName, apikey)
      .expect(200)
      .end(function (err) {
        should.not.exist(err);
        done();
      });
  });
  it('should authenticate key with scheme in headers for requests with scopes if requester is authorized', function (done) {
    let apikey = 'apikey ' + user.keyId + ':' + user.keySecret;

    request(app)
      .get('/authorizedPath')
      .set(headerName, apikey)
      .expect(200)
      .end(function (err) {
        should.not.exist(err);
        done();
      });
  });
  it('should authenticate key in query for requests with scopes if requester is authorized ', function (done) {
    let apikey = user.keyId + ':' + user.keySecret;

    request(app)
      .get('/authorizedPath?apikey=' + apikey)
      .expect(200)
      .end(function (err) {
        should.not.exist(err);
        done();
      });
  });

  it('should authenticate key in body for requests with scopes if requester is authorized ', function (done) {
    let apikey = user.keyId + ':' + user.keySecret;

    request(app)
      .post('/authorizedPath')
      .send({'apikey': apikey})
      .expect(200)
      .end(function (err) {
        should.not.exist(err);
        done();
      });
  });

  it('should not authorize invalid key', function (done) {
    let apikey = 'apikey test:wrong';

    request(app)
      .get('/authorizedPath')
      .set(headerName, apikey)
      .expect(401)
      .end(function (err) {
        should.not.exist(err);
        done();
      });
  });
});
