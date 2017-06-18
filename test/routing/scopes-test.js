let testHelper = require('./routing.helper');
let config = require('../../src/config');
let originalGatewayConfig = config.gatewayConfig;

describe('When scopes defined for apiEndpoint', () => {
  let helper = testHelper();

  before('setup', () => {
    config.gatewayConfig = {
      http: { port: 9089 },
      apiEndpoints: {
        test_default: {
          scopes: [
            { scope: 'admin', verbs: 'GET' },
            { scope: 'profile', verbs: ['GET', 'POST'] }
          ]
        }
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test_default'],
          policies: [{ test: [{ action: { name: 'test_policy' } }] }]
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

  it('should set scopes to egContext', helper.validateSuccess({
    setup: {
      url: '/'
    },
    test: {
      url: '/',
      scopes: [
        { scope: 'admin', verbs: 'GET' },
        { scope: 'profile', verbs: ['GET', 'POST'] }
      ]
    }
  }));
});
