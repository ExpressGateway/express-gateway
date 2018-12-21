const testHelper = require('../../common/routing.helper');
const config = require('../../../lib/config');
const db = require('../../../lib/db');
const originalGatewayConfig = config.gatewayConfig;

describe('rate-limit policy only for eg-test-domain.io host', () => {
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
            {
              'rate-limit': {
                condition: {
                  name: 'hostMatch',
                  pattern: 'eg-test-domain.io'
                },
                action: { max: 1 }
              }
            },
            { test: [] }
          ]
        }
      }
    };

    return helper.setup();
  });

  after('cleanup', () => {
    config.gatewayConfig = originalGatewayConfig;
    return db.flushdb().then(() => helper.cleanup());
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
  it('should allow first request to eg-test-domain.io', helper.validateSuccess({
    setup: {
      host: 'eg-test-domain.io',
      url: '/'
    },
    test: {
      host: 'eg-test-domain.io',
      url: '/'
    }
  }));
  it('should rate-limit second request to eg-test-domain.io', helper.validateError({
    setup: {
      url: '/',
      host: 'eg-test-domain.io'
    },
    test: {
      errorCode: 429
    }
  }));
});
