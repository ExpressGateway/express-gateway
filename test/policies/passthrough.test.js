const idGen = require('uuid-base62');
const request = require('supertest');

const services = require('../../lib/services');
const credentialService = services.credential;
const userService = services.user;
const serverHelper = require('../common/server-helper');
const db = require('../../lib/db');
const testHelper = require('../common/routing.helper');
const config = require('../../lib/config');
const originalGatewayConfig = config.gatewayConfig;
let dbuser1;
describe('Functional Tests @auth Policies @passthrough', () => {
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
          url: 'http://localhost:' // port will be defined after backend start
        }
      },
      apiEndpoints: {
        unauthorizedEndpoint: {
          host: '*',
          paths: ['/unauthorizedPath'],
          scopes: ['unauthorizedScope'] // #434 should accept array
        }
      },
      policies: ['key-auth', 'proxy', 'basic-auth', 'oauth2'],
      pipelines: {
        pipeline2: {
          apiEndpoints: ['unauthorizedEndpoint'],
          policies: [{
            'key-auth': [{
              action: {
                passThrough: true
              }
            }]},
          {
            'basic-auth': [{
              action: {
                passThrough: true
              }
            }]},
          {
            'oauth2': [{
              action: {
                passThrough: true
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
        return credentialService.insertScopes('authorizedScope', 'unauthorizedScope');
      })
      .then(() => {
        return credentialService.insertCredential(dbuser1.id, 'key-auth', {
          scopes: ['authorizedScope']
        });
      })
      .then((userRes) => {
        user = userRes;
        return serverHelper.generateBackendServer();
      })
      .then(({port}) => {
        config.gatewayConfig.serviceEndpoints.backend.url += port;
        return helper.setup();
      })
      .then(apps => {
        app = apps.app;
      });
  });

  after('cleanup', (done) => {
    app.close();
    config.gatewayConfig = originalGatewayConfig;
    helper.cleanup();
    done();
  });

  it('should authenticate with no headers', function (done) {
    request(app)
      .get('/unauthorizedPath')
      .expect(200)
      .end(done);
  });
  it('should authenticate key in query for requests with scopes if requester is authorized ', function (done) {
    const apikey = user.keyId + ':' + user.keySecret;

    request(app)
      .get('/unauthorizedPath?apiKey=' + apikey)
      .expect(200)
      .end(done);
  });
});
