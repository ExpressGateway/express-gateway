let testHelper = require('../../routing/routing.helper');
let config = require('../../../src/config');
let originalGatewayConfig = config.gatewayConfig;

describe('rate-limit policy only for example.com host', () => {
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
          policies: [{
            'rate-limit': [{
              condition: {
                name: 'hostMatch',
                pattern: 'example.com'
              },
              action: { name: 'rate-limit', max: 1 }
            }]
          },
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

  for (let i = 0; i < 3; i++) {
    it('should not limit if no host for req#' + i, helper.validateSuccess({
      setup: {
        url: '/'
      },
      test: {
        url: '/'
      }
    }));
  }
  it('should allow first request to example.com', helper.validateSuccess({
    setup: {
      host: 'example.com',
      url: '/'
    },
    test: {
      host: 'example.com',
      url: '/'
    }
  }));
  it('should rate-limit second request to example.com', helper.validateError({
    setup: {
      url: '/',
      host: 'example.com'
    },
    test: {
      errorCode: 429
    }
  }));
});
