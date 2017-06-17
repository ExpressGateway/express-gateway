let testHelper = require('../../routing/routing.helper');
let gatewayConfig = {
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

describe('rate-limit policy only for example.com host', () => {
  let helper = testHelper();
  before('setup', helper.setup({
    fakeActions: ['test_policy'],
    gatewayConfig
  }));
  after('cleanup', helper.cleanup());
  for (let i = 0; i < 3; i++) {
    it('should not limit if no host for req#' + i, helper.validateSuccess({
      setup: {
        url: '/'
      },
      test: {
        url: '/',
        scopes: gatewayConfig.apiEndpoints.test_default.scopes
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
      url: '/',
      scopes: gatewayConfig.apiEndpoints.test_default.scopes
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
