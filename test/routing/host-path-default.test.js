const testHelper = require('../common/routing.helper');
const config = require('../../lib/config');

// there are several configuration ways to listen to all hosts
describe('When uses defaults (capture all hosts and paths)', () => {
  const helper = testHelper();
  helper.addPolicy('test', () => (req, res) => {
    res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
  });
  let originalGatewayConfig;

  before('setup', () => {
    originalGatewayConfig = config.gatewayConfig;

    config.gatewayConfig = {
      http: { port: 9081 },
      apiEndpoints: {
        test_default: {}
      },
      policies: ['test'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test_default'],
          policies: { test: [] }
        }
      }
    };

    helper.setup();
  });

  after('cleanup', (done) => {
    helper.cleanup();
    config.gatewayConfig = originalGatewayConfig;
    done();
  });

  ['/random/17/3', '/', '/admin'].forEach(url => {
    it('should serve for random host and random path: ' + url, helper.validateSuccess({
      setup: {
        host: 'zu.io',
        url
      },
      test: {
        host: 'zu.io',
        url,
        result: 'test'
      }
    }));

    it('should serve for default host and path ' + url, helper.validateSuccess({
      setup: {
        host: undefined,
        url
      },
      test: {
        host: '127.0.0.1',
        url,
        result: 'test'
      }
    }));
  });
});
