const cliHelper = require('../common/cli.helper');
const gwHelper = require('../common/gateway.helper');
const request = require('supertest');

describe('E2E: HTTP errors', () => {
  let gatewayProcess, gatewayPort;

  before('setup', () => {
    const gatewayConfig = {
      serviceEndpoints: {
        statusService: {
          url: 'http://httpbin.org/'
        }
      },
      apiEndpoints: {
        statusApi: {
          host: '*',
          paths: '/status/*'
        }
      },
      policies: ['proxy'],
      pipelines: {
        statusPipeline: {
          apiEndpoint: 'statusApi',
          policies: [{
            proxy: {
              action: {
                serviceEndpoint: 'statusService'
              }
            }
          }]
        }
      }
    };
    return cliHelper
      .bootstrapFolder()
      .then(dirInfo => gwHelper.startGatewayInstance({dirInfo, gatewayConfig}))
      .then(gwInfo => {
        gatewayProcess = gwInfo.gatewayProcess;
        gatewayPort = gwInfo.gatewayPort;
      });
  });

  after('cleanup', (done) => {
    gatewayProcess.kill();
    done();
  });

  [400, 401, 500, 502].forEach((status) => {
    it(`should response with status ${status}`, () => request(`http://localhost:${gatewayPort}`)
        .get(`/status/${status}`)
        .expect(status)
    );
  });

  it(`should response with status 404`, () => request(`http://localhost:${gatewayPort}`)
    .get(`/not-found`)
    .expect(404)
  );
});
