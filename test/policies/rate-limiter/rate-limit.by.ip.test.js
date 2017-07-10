let mock = require('mock-require');
mock('redis', require('fakeredis'));

let testHelper = require('../../common/routing.helper');
let config = require('../../../lib/config');
let originalGatewayConfig = config.gatewayConfig;

describe('rate-limit policy', () => {
  let helper = testHelper();
  helper.addPolicy('test', () => (req, res) => {
    res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
  });

  before('setup', () => {
    config.gatewayConfig = {
      http: { port: 9089 },
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

    helper.setup();
  });

  after('cleanup', (done) => {
    config.gatewayConfig = originalGatewayConfig;
    helper.cleanup();
    done();
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
