let testHelper = require('../../routing/routing.helper');
const hosts = ['test.com', 'example.com', 'zu.io'];
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

describe.only('rate-limit by host', () => {
  let helper = testHelper();
  before('setup', helper.setup({
    fakeActions: ['test_policy'],
    gatewayConfig
  }));
  after('cleanup', helper.cleanup());
  hosts.forEach(host => {
    it('should allow first request for host ' + host, helper.validateSuccess({
      setup: {
        url: '/',
        host
      },
      test: {
        url: '/',
        host,
        scopes: gatewayConfig.apiEndpoints.test_default.scopes
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
