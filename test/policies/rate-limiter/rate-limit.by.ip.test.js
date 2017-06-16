let testHelper = require('../../routing/routing.helper');
let gatewayConfig = {
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

describe('rate-limit policy', () => {
  let helper = testHelper();
  before('setup', helper.setup({
    fakeActions: ['test_policy'],
    gatewayConfig
  }));
  after('cleanup', helper.cleanup());
  it('should allow first request ', helper.validateSuccess({
    setup: {
      url: '/'
    },
    test: {
      url: '/',
      scopes: gatewayConfig.apiEndpoints.test_default.scopes
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
