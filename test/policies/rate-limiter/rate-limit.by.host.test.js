const testHelper = require('../../common/routing.helper');
const config = require('../../../lib/config');
const originalGatewayConfig = config.gatewayConfig;

describe('rate-limit by host', () => {
  const helper = testHelper();
  helper.addPolicy('test', () => (req, res) => {
    res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
  });
  const hosts = ['test.com', 'example.com', 'zu.io'];

  before('setup', () => {
    config.gatewayConfig = {
      http: { port: 0 },
      apiEndpoints: {
        test_default: {}
      },
      policies: ['rate-limit', 'test'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test_default'],
          policies: [
            {
              'rate-limit': {
                action: {
                  max: 1,
                  // eslint-disable-next-line no-template-curly-in-string
                  rateLimitBy: '${req.host}'
                }
              }
            },
            { test: {} }
          ]
        }
      }
    };

    helper.setup();
  });

  after('cleanup', (done) => {
    helper.cleanup();
    config.gatewayConfig = originalGatewayConfig;
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
