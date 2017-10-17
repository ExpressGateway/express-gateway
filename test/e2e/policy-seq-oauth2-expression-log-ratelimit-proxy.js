const mock = require('mock-require');
mock('redis', require('fakeredis'));

const session = require('supertest-session');
const should = require('should');
const qs = require('querystring');
const url = require('url');
const express = require('express');
const sinon = require('sinon');
const assert = require('assert');

const logger = require('../../lib/policies/log/winston-logger');
const credentialModelConfig = require('../../lib/config/models/credentials');
const userModelConfig = require('../../lib/config/models/users');
const appModelConfig = require('../../lib/config/models/applications');
const services = require('../../lib/services');
const credentialService = services.credential;
const userService = services.user;
const applicationService = services.application;
const db = require('../../lib/db')();

const testHelper = require('../common/routing.helper');
const config = require('../../lib/config');
const originalGatewayConfig = config.gatewayConfig;

describe('E2E: oauth2, proxy, log, expression, rate-limit policies', () => {
  const helper = testHelper();
  const spy = sinon.spy();
  let originalAppConfig, originalCredentialConfig, originalUserConfig;
  let user, application, token, app, backendServer;

  before('setup', (done) => {
    sinon.spy(logger, 'info');

    config.gatewayConfig = {
      http: { port: 0 },
      serviceEndpoints: {
        backend: {
          url: 'http://localhost:7777'
        }
      },
      apiEndpoints: {
        authorizedEndpoint: {
          host: '*',
          paths: ['/authorizedPath'],
          scopes: ['authorizedScope']
        }
      },
      policies: ['oauth2', 'proxy', 'log', 'expression', 'rate-limit'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['authorizedEndpoint'],
          policies: [
            { oauth2: null },
            {
              expression: {
                action: {
                  jscode: 'req.url = req.url + "/67"'
                }
              }
            },
            {
              log: [
                {
                  action: {
                    // eslint-disable-next-line no-template-curly-in-string
                    message: '${req.url} ${egContext.req.method}'
                  }
                },
                {
                  condition: {
                    name: 'never'
                  },
                  action: {
                    // eslint-disable-next-line no-template-curly-in-string
                    message: '${req.url} ${egContext.req.method}'
                  }
                }
              ]
            },
            {
              'rate-limit': {
                action: {
                  max: 1,
                  // eslint-disable-next-line no-template-curly-in-string
                  rateLimitBy: '${req.host}'
                }
              }
            },
            {
              proxy: {
                action: { serviceEndpoint: 'backend' }
              }
            }
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

    db
      .flushdbAsync()
      .then(function () {
        const user1 = {
          username: 'irfanbaqui',
          firstname: 'irfan',
          lastname: 'baqui',
          email: 'irfan@eg.com'
        };

        return userService.insert(user1);
      })
      .then(_user => {
        should.exist(_user);
        user = _user;

        const app1 = {
          name: 'irfan_app',
          redirectUri: 'https://some.host.com/some/route'
        };

        return applicationService.insert(app1, user.id);
      })
      .then(_app => {
        should.exist(_app);
        application = _app;

        return credentialService.insertScopes(['authorizedScope']);
      })
      .then(() =>
        Promise.all([credentialService.insertCredential(application.id, 'oauth2', { secret: 'app-secret', scopes: ['authorizedScope'] }),
          credentialService.insertCredential(user.username, 'basic-auth', { password: 'password', scopes: ['authorizedScope'] })])
      )
      .then(res => {
        should.exist(res);
        return helper.setup();
      })
      .then(apps => {
        app = apps.app;
        const request = session(app);

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
                    const params = qs.parse(url.parse(res.headers.location).hash.slice(1));
                    token = params.access_token;

                    const backendApp = express();
                    backendApp.all('*', (req, res) => {
                      spy(req.headers);
                      res.send();
                    });

                    const runningBackendApp = backendApp.listen(7777, () => {
                      backendServer = runningBackendApp;
                      done();
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
    credentialModelConfig.oauth2 = originalCredentialConfig.oauth2;
    userModelConfig.properties = originalUserConfig.properties;
    logger.info.restore();
    backendServer.close();
    done();
  });

  it('should execute oauth2, proxy, log, expression, rate-limit policies and return 200', function (done) {
    const request = session(app);

    request
      .get('/authorizedPath')
      .set('Authorization', 'bearer ' + token)
      .expect(200)
      .end(function (err) {
        should.not.exist(err);
        assert(spy.calledOnce);
        assert.equal(logger.info.getCall(0).args[0], '/authorizedPath/67 GET');
        should.not.exist(logger.info.getCall(1));
        done();
      });
  });

  it('should execute oauth2, proxy, log, expression, rate-limit policies and return 429 as rate limit is reached', function (done) {
    const request = session(app);

    request
      .get('/authorizedPath')
      .set('Authorization', 'bearer ' + token)
      .expect(429)
      .end(function (err) {
        should.not.exist(err);
        assert(spy.calledOnce);
        assert.equal(logger.info.getCall(1).args[0], '/authorizedPath/67 GET');
        done();
      });
  });
});
