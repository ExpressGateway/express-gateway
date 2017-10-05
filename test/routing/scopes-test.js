const testHelper = require('../common/routing.helper');
const config = require('../../lib/config');

describe('When scopes defined for apiEndpoint', () => {
  const helper = testHelper();

  before('setup', () => {
    const scopes = [
      { scope: 'admin', verbs: 'GET' },
      { scope: 'profile', verbs: ['GET', 'POST'] }
    ];
    config.gatewayConfig = {
      http: { port: 0 },
      apiEndpoints: {
        test_default: {
          scopes
        }
      },
      policies: ['scopeTest'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test_default'],
          policies: { scopeTest: {} }
        }
      }
    };
    const plugins = {
      policies: [{
        name: 'scopeTest',
        policy: () => (req, res) => res.json({url: req.url, scopes, apiEndpoint: req.egContext.apiEndpoint})
      } ]
    };
    helper.setup({config, plugins});
  });

  after('cleanup', (done) => {
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
