const testHelper = require('../../common/routing.helper');
const config = require('../../../lib/config');
const originalGatewayConfig = config.gatewayConfig;

describe('rate-limit policy', () => {
  const helper = testHelper();
  helper.addPolicy('test', () => (req, res) => {
    res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
  });

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
            { 'rate-limit': { action: { max: 1 } } },
            { test: [] }
          ]
        }
      }
    };

    return helper.setup();
  });

  after('cleanup', () => {
    config.gatewayConfig = originalGatewayConfig;
    return helper.cleanup();
  });

  it('should allow first request ', helper.validateSuccess({
    setup: {
      url: '/'
    },
    test: {
      url: '/'
    }
  }));
  it('should rate-limit second request ', helper.validateError({
    setup: {
      url: '/'
    },
    test: {
      errorCode: 429
    }
  }));
});
