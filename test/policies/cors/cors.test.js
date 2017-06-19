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
        'cors': [{
          action: {
            name: 'cors',
            origin: 'http://www.example.com',
            methods: 'HEAD,PUT,PATCH,POST,DELETE',
            allowedHeaders: 'X-TEST'
          }
        }]
      }, {
        test: [{ action: { name: 'test_policy' } }]
      }]
    }
  }
};

describe('cors', () => {
  let helper = testHelper();
  before('setup', helper.setup({
    fakeActions: ['test_policy'],
    gatewayConfig
  }));
  after('cleanup', helper.cleanup());
  it('should allow first request for host', helper.validateOptions({
    setup: {
      url: '/',
      preflight: true
    },
    test: {
      url: '/',
      statusCode: 204,
      headers: {
        'access-control-allow-origin': 'http://www.example.com',
        'access-control-allow-methods': 'HEAD,PUT,PATCH,POST,DELETE',
        'access-control-allow-headers': 'X-TEST'
      }
    }
  }));
});
