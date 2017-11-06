const session = require('supertest-session');
const should = require('should');

const credentialModelConfig = require('../../../lib/config/models/credentials');
const userModelConfig = require('../../../lib/config/models/users');
const appModelConfig = require('../../../lib/config/models/applications');
const services = require('../../../lib/services/index');
const credentialService = services.credential;
const userService = services.user;
const applicationService = services.application;
const serverHelper = require('../../common/server-helper');
const db = require('../../../lib/db')();

const testHelper = require('../../common/routing.helper');
const config = require('../../../lib/config');
const originalGatewayConfig = config.gatewayConfig;

describe('Functional Tests oAuth2.0 Policy', () => {
  const helper = testHelper();
  let originalAppConfig, originalCredentialConfig, originalUserConfig;
  let user, application, token, app;

  before('setup', (done) => {
    config.gatewayConfig = {
      http: { port: 0 },
      serviceEndpoints: {
        backend: {
          url: 'http://localhost:6069'
        }
      },
      apiEndpoints: {
        authorizedEndpoint: {
          host: '*',
          paths: ['/authorizedPath'],
          scopes: ['authorizedScope']
        },
        unauthorizedEndpoint: {
          host: '*',
          paths: ['/unauthorizedPath'],
          scopes: ['unauthorizedScope']
        }
      },
      policies: ['oauth2', 'proxy'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['authorizedEndpoint'],
          policies: [
            { oauth2: {} },
            { proxy: [{ action: { serviceEndpoint: 'backend' } }] }
          ]
        },
        pipeline2: {
          apiEndpoints: ['unauthorizedEndpoint'],
          policies: [
            { oauth2: {} },
            { proxy: [{ action: { serviceEndpoint: 'backend' } }] }
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
      firstname: { isRequired: true, isMutable: true },
      lastname: { isRequired: true, isMutable: true },
      email: { isRequired: false, isMutable: true }
    };

    db.flushdbAsync()
      .then(function () {
        const user1 = {
          username: 'irfanbaqui',
          firstname: 'irfan',
          lastname: 'baqui',
          email: 'irfan@eg.com'
        };

        userService.insert(user1)
          .then(_user => {
            should.exist(_user);
            user = _user;

            const app1 = {
              name: 'irfan_app',
              redirectUri: 'https://some.host.com/some/route'
            };

            applicationService.insert(app1, user.id)
              .then(_app => {
                should.exist(_app);
                application = _app;

                return credentialService.insertScopes(['authorizedScope', 'unauthorizedScope'])
                  .then(() => {
                    credentialService.insertCredential(application.id, 'oauth2', { secret: 'app-secret', scopes: ['authorizedScope'] })
                      .then(res => {
                        should.exist(res);

                        helper.setup()
                          .then(apps => {
                            app = apps.app;
                            const request = session(app);
                            request
                              .post('/oauth2/token')
                              .send({
                                grant_type: 'client_credentials',
                                client_id: application.id,
                                client_secret: 'app-secret',
                                scope: 'authorizedScope'
                              })
                              .expect(200)
                              .end(function (err, res) {
                                should.not.exist(err);
                                token = res.body;
                                should.exist(token);

                                return serverHelper.generateBackendServer(6069)
                                  .then(() => {
                                    done();
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
    config.gatewayConfig = originalGatewayConfig;
    appModelConfig.properties = originalAppConfig.properties;
    credentialModelConfig.oauth2 = originalCredentialConfig.oauth2;
    userModelConfig.properties = originalUserConfig.properties;
    helper.cleanup();
    done();
  });

  it('should not authenticate token for requests without token header', function (done) {
    const request = session(app);

    request
      .get('/authorizedPath')
      .expect(401)
      .end(function (err) {
        should.not.exist(err);
        done();
      });
  });

  it('should not authenticate token for requests if requester doesn\'t have authorized scopes', function (done) {
    const request = session(app);

    request
      .get('/unauthorizedPath')
      .expect(401)
      .end(function (err) {
        should.not.exist(err);
        done();
      });
  });

  it('should authenticate token for requests with scopes if requester is authorized', function (done) {
    const request = session(app);

    request
      .get('/authorizedPath')
      .set('Authorization', 'bearer ' + token.access_token)
      .expect(200)
      .end(function (err, res) {
        should.not.exist(err);
        done();
      });
  });

  it('should not authenticate invalid token', function (done) {
    const request = session(app);

    request
      .get('/authorizedPath')
      .set('Authorization', 'bearer some-bogus-token')
      .expect(401)
      .end(function (err) {
        should.not.exist(err);
        done();
      });
  });
});
