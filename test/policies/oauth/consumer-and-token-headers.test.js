const idGen = require('uuid62');
const session = require('supertest-session');
const qs = require('querystring');
const url = require('url');
const express = require('express');
const sinon = require('sinon');
const should = require('should');

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
                  headersPrefix: 'eg-',
                  forwardHeaders: {
                    'id': 'consumer.id',
                    'consumer-name': 'consumer.name',
                    'consumer-type': 'consumer.type',
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
      .then(res => helper.setup())
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

  after('cleanup', () => {
    config.gatewayConfig = originalGatewayConfig;
    backendServer.close();
    return helper.cleanup();
  });

  it('should authenticate token for requests with scopes if requester is authorized', function () {
    const request = session(app);
    return request
      .get('/authorizedPath')
      .set('Authorization', 'bearer ' + token)
      .expect(200)
      .then(() => {
        const headers = spy.getCall(0).args[0];
        should(spy.calledOnce).true();
        should(headers).have.property('eg-consumer-id', application.id);
        should(headers).have.property('eg-consumer-name', application.name);
        should(headers).have.property('eg-consumer-type', 'application');
        should(headers).have.property('eg-request-id');
        should(headers).have.property('eg-scopes', 'authorizedScope');

        should(Object.keys(spy.getCall(0).args[0])).not.containEql('authorization');
      });
  });
});
