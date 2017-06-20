let mock = require('mock-require');
mock('redis', require('fakeredis'));

let testHelper = require('../../routing/routing.helper');
let config = require('../../../src/config');
let originalGatewayConfig = config.gatewayConfig;

describe('rate-limit by host', () => {
  let helper = testHelper();
  const hosts = ['test.com', 'example.com', 'zu.io'];

  before('setup', () => {
    config.gatewayConfig = {
      http: { port: 9089 },
      apiEndpoints: {
        test_default: {}
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test_default'],
          policies: [{
            'rate-limit': [{
              action: {
                name: 'rate-limit',
                max: 1,
                // eslint-disable-next-line no-template-curly-in-string
                rateLimitBy: '${req.host}'
              }
            }]
          }, {
            test: [{ action: { name: 'test_policy' } }]
          }]
        }
      }
    };

    helper.setup({ fakeActions: ['test_policy'] })();
  });

  after('cleanup', (done) => {
    config.gatewayConfig = originalGatewayConfig;
    helper.cleanup();
    done();
  });

  hosts.forEach(host => {
    it('should allow first request for host ' + host, helper.validateSuccess({
      setup: {
        url: '/',
        host
      },
      test: {
        url: '/',
        host
      }
    }));
  });
  hosts.forEach(host => {
    it('should rate-limit second request for host ' + host, helper.validateError({
      setup: {
        url: '/',
        host
      },
      test: {
        errorCode: 429
      }
    }));
  });
});
