let testHelper = require('../../routing/routing.helper');
let config = require('../../../src/config');
let originalGatewayConfig = config.gatewayConfig;

describe('rate-limit policy', () => {
  let helper = testHelper();

  before('setup', () => {
    config.gatewayConfig = {
      http: { port: 9089 },
      apiEndpoints: {
        test_default: {}
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test_default'],
          policies: [
            { 'rate-limit': [{ action: { name: 'rate-limit', max: 1 } }] },
            { test: [{ action: { name: 'test_policy' } }] }
          ]
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
