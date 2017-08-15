const cliHelper = require('../common/cli.helper');
const gwHelper = require('../common/gateway.helper');
const request = require('supertest');
let gatewayProcess = null;
let gatewayPort, adminPort, configDirectoryPath;
let username = 'test';
let keyCred;
const headerName = 'Authorization';
let proxyPolicy = {
  proxy: { action: { serviceEndpoint: 'backend' } }
};
describe('E2E: key-auth Policy', () => {
  before('setup', () => {
    let gatewayConfig = {
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
            'key-auth': {}
          },
            proxyPolicy
          ]
        },
        pipeline_by_query: {
          apiEndpoints: ['onlyQueryParamEndpoint'],
          policies: [{
            'key-auth': [{
              action: {
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
    return cliHelper.bootstrapFolder().then(dirInfo => {
      return gwHelper.startGatewayInstance({dirInfo, gatewayConfig});
    }).then(gwInfo => {
      gatewayProcess = gwInfo.gatewayProcess;
      gatewayPort = gwInfo.gatewayPort;
      adminPort = gwInfo.adminPort;
      configDirectoryPath = gwInfo.dirInfo.configDirectoryPath;

      return cliHelper.runCLICommand({
        cliArgs: ['scopes create', 'authorizedScope', 'unauthorizedScope'],
        adminPort,
        configDirectoryPath});
    }).then((scopes) => {
      const args = [
        '-p', `username=${username}`,
        '-p', 'firstname=Kate',
        '-p', 'lastname=Smith'
      ];
      return cliHelper.runCLICommand({
        cliArgs: ['users create '].concat(args),
        adminPort,
        configDirectoryPath});
    }).then(newUser => {
      return cliHelper.runCLICommand({
        cliArgs: ['credentials create -t key-auth -p "scopes=authorizedScope" -c ', newUser.id],
        adminPort,
        configDirectoryPath});
    }).then(cred => {
      keyCred = cred;
    });
  });

  after('cleanup', (done) => {
    gatewayProcess.kill();
    done();
  });

  it('should not authenticate key for requests without authorization header', function () {
    return request(`http://localhost:${gatewayPort}`)
      .get('/authorizedPath')
      .expect(401);
  });

  it('should not authorise key for requests if requester doesn\'t have authorized scopes', function (done) {
    let apikey = 'apiKey ' + keyCred.keyId + ':' + keyCred.keySecret;

    request(`http://localhost:${gatewayPort}`)
      .get('/unauthorizedPath')
      .set(headerName, apikey)
      .expect(403)
      .end(function (err) {
        done(err);
      });
  });

  it('should authenticate key with scheme in headers for requests with scopes if requester is authorized', function (done) {
    let apikey = 'SCHEME1 ' + keyCred.keyId + ':' + keyCred.keySecret;

    request(`http://localhost:${gatewayPort}`)
      .get('/authorizedPath')
      .set('TEST_HEADER', apikey)
      .expect(200)
      .end(done);
  });
  it('should authenticate key with scheme ignoring case in headers for requests with scopes if requester is authorized', function (done) {
    let apikey = 'scheME1 ' + keyCred.keyId + ':' + keyCred.keySecret;

    request(`http://localhost:${gatewayPort}`)
      .get('/authorizedPath')
      .set('TEST_HEADER', apikey)
      .expect(200)
      .end(done);
  });
  it('should authenticate key in query for requests with scopes if requester is authorized ', function (done) {
    let apikey = keyCred.keyId + ':' + keyCred.keySecret;

    request(`http://localhost:${gatewayPort}`)
      .get('/authorizedPath?apiKey=' + apikey)
      .expect(200)
      .end(done);
  });

  it('should not authorize invalid key', function (done) {
    let apikey = 'apiKey test:wrong';

    request(`http://localhost:${gatewayPort}`)
      .get('/authorizedPath')
      .set(headerName, apikey)
      .expect(401)
      .end(done);
  });

  it('should authenticate key in query if endpoint allows only query ', function (done) {
    let apikey = keyCred.keyId + ':' + keyCred.keySecret;

    request(`http://localhost:${gatewayPort}`)
      .get('/by_query?customApiKeyParam=' + apikey)
      .expect(200)
      .end(done);
  });
  it('should not authenticate with header of EP allows only query', function (done) {
    let apikey = 'apiKey ' + keyCred.keyId + ':' + keyCred.keySecret;

    request(`http://localhost:${gatewayPort}`)
      .get('/by_query')
      .set(headerName, apikey)
      .expect(401)
      .end(function (err) {
        done(err);
      });
  });
});
