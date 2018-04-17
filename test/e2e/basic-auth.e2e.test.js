const cliHelper = require('../common/cli.helper');
const gwHelper = require('../common/gateway.helper');
const request = require('supertest');
let gatewayPort, adminPort, configDirectoryPath, gatewayProcess, backendServer;
const username = 'test';
const proxyPolicy = {
  proxy: { action: { serviceEndpoint: 'backend' } }
};
describe('E2E: basic-auth Policy', () => {
  before('setup', () => {
    const gatewayConfig = {
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
      policies: ['basic-auth', 'proxy'],
      pipelines: {
        pipeline1: {
          apiEndpoint: 'authorizedEndpoint',
          policies: [
            { 'basic-auth': {} }, proxyPolicy
          ]
        },
        pipeline2: {
          apiEndpoint: 'unauthorizedEndpoint',
          policies: [
            { 'basic-auth': {} }, proxyPolicy
          ]
        }
      }
    };
    return cliHelper.bootstrapFolder()
      .then(dirInfo => gwHelper.startGatewayInstance({ dirInfo, gatewayConfig }))
      .then(gwInfo => {
        gatewayProcess = gwInfo.gatewayProcess;
        backendServer = gwInfo.backendServer;
        gatewayPort = gwInfo.gatewayPort;
        adminPort = gwInfo.adminPort;
        configDirectoryPath = gwInfo.dirInfo.configDirectoryPath;

        return cliHelper.runCLICommand({
          cliArgs: ['scopes create', 'authorizedScope', 'unauthorizedScope'],
          adminPort,
          configDirectoryPath
        });
      }).then((scopes) => {
        const args = [
          '-p', `username=${username}`,
          '-p', 'firstname=Kate',
          '-p', 'lastname=Smith'
        ];
        return cliHelper.runCLICommand({
          cliArgs: ['users create '].concat(args),
          adminPort,
          configDirectoryPath
        });
      }).then(newUser => {
        return cliHelper.runCLICommand({
          cliArgs: ['credentials create -t basic-auth -p "scopes=authorizedScope" -p "password=pass" -c ', username],
          adminPort,
          configDirectoryPath
        });
      });
  });

  after((done) => {
    gatewayProcess.kill();
    backendServer.close(done);
  });

  it('should not authenticate token for requests without token header', function () {
    return request(`http://localhost:${gatewayPort}`)
      .get('/authorizedPath')
      .expect(401);
  });

  it('should not authenticate token for requests if requester doesn\'t have authorized scopes', function () {
    const credentials = Buffer.from(username.concat(':pass')).toString('base64');

    return request(`http://localhost:${gatewayPort}`)
      .get('/unauthorizedPath')
      .set('Authorization', 'basic ' + credentials)
      .expect(401);
  });

  it('should authenticate token for requests with scopes if requester is authorized', function () {
    const credentials = Buffer.from(username.concat(':pass')).toString('base64');

    return request(`http://localhost:${gatewayPort}`)
      .get('/authorizedPath')
      .set('Authorization', 'basic ' + credentials)
      .expect(200);
  });

  it('should not authenticate invalid token', function () {
    const credentials = Buffer.from(username.concat(':wrongPassword')).toString('base64');

    request(`http://localhost:${gatewayPort}`)
      .get('/authorizedPath')
      .set('Authorization', 'basic ' + credentials)
      .expect(401);
  });
});
