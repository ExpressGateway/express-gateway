let mock = require('mock-require');
mock('redis', require('fakeredis'));

let testHelper = require('../../common/routing.helper');
let config = require('../../../lib/config');
let originalGatewayConfig = config.gatewayConfig;

describe('rate-limit policy only for example.com host', () => {
  let helper = testHelper();
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
                  pattern: 'example.com'
                },
                action: { max: 1 }
              }
            },
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
