let mock = require('mock-require');
mock('redis', require('fakeredis'));

let session = require('supertest-session');
let should = require('should');
let qs = require('querystring');
let url = require('url');
let express = require('express');
let sinon = require('sinon');
let assert = require('assert');

let credentialModelConfig = require('../../../lib/config/models/credentials');
let userModelConfig = require('../../../lib/config/models/users');
let appModelConfig = require('../../../lib/config/models/applications');
let services = require('../../../lib/services/index');
let credentialService = services.credential;
let userService = services.user;
let applicationService = services.application;
let db = require('../../../lib/db')();

let testHelper = require('../../common/routing.helper');
let config = require('../../../lib/config');
let originalGatewayConfig = config.gatewayConfig;

describe('Request Headers with consumer and token information as part of auth policies', () => {
  let helper = testHelper();
  let spy = sinon.spy();
  let originalAppConfig, originalCredentialConfig, originalUserConfig;
  let user, application, token, app, backendServer;

  before('setup', (done) => {
    config.gatewayConfig = {
      http: { port: 9089 },
      serviceEndpoints: {
        backend: {
          url: 'http://localhost:7777'
        }
      },
      apiEndpoints: {
        authorizedEndpoint: {
          host: '*',
          paths: ['/authorizedPath'],
          scopes: [ 'authorizedScope' ]
        }
      },
      policies: ['oauth2', 'proxy'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['authorizedEndpoint'],
          policies: [
            { oauth2: {} },
            { proxy: [ { action: { serviceEndpoint: 'backend' } } ] }
          ]
        }
      }
    };

    originalAppConfig = appModelConfig;
    originalCredentialConfig = credentialModelConfig;
    originalUserConfig = userModelConfig;

    appModelConfig.properties = {
      name: { isRequired: true, isMutable: true },
      redirectUri: { isRequired: true, isMutable: true }
    };

    credentialModelConfig.oauth2 = {
      passwordKey: 'secret',
      properties: { scopes: { isRequired: false } }
    };

    userModelConfig.properties = {
      firstname: {isRequired: true, isMutable: true},
      lastname: {isRequired: true, isMutable: true},
      email: {isRequired: false, isMutable: true}
    };

    db.flushdbAsync()
      .then(function () {
        let user1 = {
          username: 'irfanbaqui',
          firstname: 'irfan',
          lastname: 'baqui',
          email: 'irfan@eg.com'
        };

        userService.insert(user1)
          .then(_user => {
            should.exist(_user);
            user = _user;

            let app1 = {
              name: 'irfan_app',
              redirectUri: 'https://some.host.com/some/route'
            };

            applicationService.insert(app1, user.id)
              .then(_app => {
                should.exist(_app);
                application = _app;

                return credentialService.insertScopes(['authorizedScope'])
                  .then(() => {
                    Promise.all([ credentialService.insertCredential(application.id, 'oauth2', { secret: 'app-secret', scopes: ['authorizedScope'] }),
                      credentialService.insertCredential(user.username, 'basic-auth', { password: 'password', scopes: ['authorizedScope'] }) ])
                      .then(res => {
                        should.exist(res);

                        helper.setup()
                          .then(apps => {
                            app = apps.app;
                            let request = session(app);

                            request
                              .post('/login')
                              .query({
                                username: user.username,
                                password: 'password'
                              })
                              .expect(302)
                              .end(function (err, res) {
                                should.not.exist(err);

                                request
                                  .get('/oauth2/authorize')
                                  .query({
                                    redirect_uri: application.redirectUri,
                                    response_type: 'token',
                                    client_id: application.id,
                                    scope: 'authorizedScope'
                                  })
                                  .expect(200)
                                  .end(function (err, res) {
                                    should.not.exist(err);

                                    request
                                      .post('/oauth2/authorize/decision')
                                      .query({
                                        transaction_id: res.headers.transaction_id
                                      })
                                      .expect(302)
                                      .end(function (err, res) {
                                        should.not.exist(err);
                                        let params = qs.parse(url.parse(res.headers.location).hash.slice(1));
                                        token = params.access_token;

                                        let backendApp = express();
                                        backendApp.all('*', (req, res) => {
                                          spy(req.headers);
                                          res.send();
                                        });

                                        let runningBackendApp = backendApp.listen(7777, () => {
                                          backendServer = runningBackendApp;
                                          done();
                                        });
                                      });
                                  });
                              });
                          });
                      });
                  });
              });
          });
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
  });

  after('cleanup', (done) => {
    helper.cleanup();
    config.gatewayConfig = originalGatewayConfig;
    appModelConfig.properties = originalAppConfig.properties;
    credentialModelConfig = originalCredentialConfig;
    userModelConfig.properties = originalUserConfig.properties;
    backendServer.close();
    done();
  });

  it('should authenticate token for requests with scopes if requester is authorized', function (done) {
    let request = session(app);
    let expectedHeaders = [
      'eg-token-scopes',
      'eg-token-redirect-uri',
      'eg-token-id',
      'eg-token-expires-at',
      'eg-token-created-at',
      'eg-token-consumer-id',
      'eg-token-authenticated-user-id',
      'eg-token-auth-type',
      'eg-consumer-user-id',
      'eg-consumer-updated-at',
      'eg-consumer-redirect-uri',
      'eg-consumer-name',
      'eg-consumer-is-active',
      'eg-consumer-id',
      'eg-consumer-created-at',
      'eg-consumer-type'
    ];

    request
      .get('/authorizedPath')
      .set('Authorization', 'bearer ' + token)
      .expect(200)
      .end(function (err) {
        should.not.exist(err);
        assert(spy.calledOnce);
        expectedHeaders.forEach(header => {
          assert(Object.keys(spy.getCall(0).args[0]).indexOf(header) !== -1);
        });

        assert(Object.keys(spy.getCall(0).args[0]).indexOf('authorization') === -1);
        done();
      });
  });
});
