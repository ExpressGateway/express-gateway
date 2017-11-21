const idGen = require('uuid-base62');
const session = require('supertest-session');
const qs = require('querystring');
const url = require('url');
const express = require('express');
const sinon = require('sinon');
const assert = require('assert');

let credentialModelConfig = require('../../../lib/config/models/credentials');
const userModelConfig = require('../../../lib/config/models/users');
const appModelConfig = require('../../../lib/config/models/applications');
const services = require('../../../lib/services/index');
const credentialService = services.credential;
const userService = services.user;
const applicationService = services.application;
const db = require('../../../lib/db');

const testHelper = require('../../common/routing.helper');
const config = require('../../../lib/config');
const originalGatewayConfig = config.gatewayConfig;
let request;
describe('Request @headers @proxy downstream @auth @key-auth', () => {
  const helper = testHelper();
  const spy = sinon.spy();
  let originalAppConfig, originalCredentialConfig, originalUserConfig;
  let user, application, token, app, backendServer;

  before('setup', () => {
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
      policies: ['oauth2', 'proxy', 'headers'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['authorizedEndpoint'],
          policies: [
            { oauth2: {} },
            {
              'headers': [{
                action: {
                  headerPrefix: 'eg-',
                  forwardHeaders: {
                    'id': 'consumer.id',
                    'consumer-name': 'consumer.name',
                    'consumer-type': 'consumer.type',
                    'requestID': 'requestID',
                    'scopes': 'consumer.token.scopes'
                  }
                }
              }]
            },
            {
              proxy: [{
                action: {
                  serviceEndpoint: 'backend'
                }
              }]
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

    return db.flushdb()
      .then(function () {
        const user1 = {
          username: idGen.v4(),
          firstname: 'test',
          lastname: 'test',
          email: 'test@eg.com'
        };

        return userService.insert(user1);
      })
      .then(_user => {
        user = _user;
        const app1 = {
          name: idGen.v4(),
          redirectUri: 'https://some.host.com/some/route'
        };
        return applicationService.insert(app1, user.id);
      })
      .then(_app => {
        application = _app;
        return credentialService.insertScopes(['authorizedScope']);
      })
      .then(() => {
        return Promise.all([
          credentialService.insertCredential(application.id, 'oauth2', { secret: 'app-secret', scopes: ['authorizedScope'] }),
          credentialService.insertCredential(user.id, 'basic-auth', { password: 'password', scopes: ['authorizedScope'] })
        ]);
      })
      .then(res => {
        return helper.setup();
      })
      .then(apps => {
        app = apps.app;
        request = session(app);

        return request
          .post('/login')
          .query({
            username: user.username,
            password: 'password'
          })
          .expect(302);
      })
      .then((res) => {
        return request
          .get('/oauth2/authorize')
          .query({
            redirect_uri: application.redirectUri,
            response_type: 'token',
            client_id: application.id,
            scope: 'authorizedScope'
          })
          .expect(200);
      })
      .then((res) => {
        return request
          .post('/oauth2/authorize/decision')
          .query({
            transaction_id: res.headers.transaction_id
          })
          .expect(302);
      })
      .then((res) => {
        const params = qs.parse(url.parse(res.headers.location).hash.slice(1));
        token = params.access_token;

        const backendApp = express();
        backendApp.all('*', (req, res) => {
          spy(req.headers);
          res.send();
        });
        return new Promise(resolve => {
          const runningBackendApp = backendApp.listen(7777, () => {
            backendServer = runningBackendApp;
            resolve();
          });
        });
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

  it('should authenticate token for requests with scopes if requester is authorized', function () {
    const request = session(app);
    return request
      .get('/authorizedPath')
      .set('Authorization', 'bearer ' + token)
      .expect(200)
      .then(() => {
        assert(spy.calledOnce);
        const headers = spy.getCall(0).args[0];
        assert.equal(headers['eg-consumer-id'], application.id);
        assert.equal(headers['eg-consumer-name'], application.name);
        assert.equal(headers['eg-consumer-type'], 'application');
        assert.ok(headers['eg-requestid']);
        assert.equal(headers['eg-scopes'], 'authorizedScope');

        assert(Object.keys(spy.getCall(0).args[0]).indexOf('authorization') === -1);
      });
  });
});
