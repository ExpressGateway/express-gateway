const testHelper = require('../common/routing.helper');
const config = require('../../lib/config');

// there are several configuration ways to listen to all hosts
['*', '', undefined].forEach(hostBind => {
  describe('When configured to capture all hosts with config host:' + hostBind, () => {
    const originalGatewayConfig = config.gatewayConfig;

    const helper = testHelper();
    helper.addPolicy('test', () => (req, res) => {
      res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
    });

    before('setup', () => {
      config.gatewayConfig = {
        http: { port: 9081 },
        policies: ['test'],
        apiEndpoints: {
          test_regex: { pathRegex: '/wild-cats$' },
          test_path: { paths: '/admin' }
        },
        pipelines: {
          pipeline1: {
            apiEndpoints: ['test_regex', 'test_path'],
            policies: { test: [] }
          }
        }
      };

      config.gatewayConfig.apiEndpoints.test_regex.host = hostBind;
      config.gatewayConfig.apiEndpoints.test_path.host = hostBind;

      helper.setup();
    });

    after('cleanup', (done) => {
      helper.cleanup();
      config.gatewayConfig = originalGatewayConfig;
      done();
    });

    it('should serve for random host and pathRegex matched', helper.validateSuccess({
      setup: {
        host: 'zu.io',
        url: '/wild-cats'
      },
      test: {
        host: 'zu.io',
        url: '/wild-cats',
        result: 'test'
      }
    }));

    it('should serve for default host and pathRegex matched', helper.validateSuccess({
      setup: {
        host: undefined,
        url: '/wild-cats'
      },
      test: {
        host: '127.0.0.1',
        url: '/wild-cats',
        result: 'test'
      }
    }));
    it('should 404 for default host + regexPath not matched', helper.validate404({
      setup: {
        url: '/wild-cats2'
      }
    }));

    it('should serve for default host + path matched', helper.validateSuccess({
      setup: {
        url: '/admin'
      },
      test: {
        host: '127.0.0.1',
        url: '/admin',
        result: 'test'
      }
    }));
    it('should 404 for default host and path not matched', helper.validate404({
      setup: {
        url: '/admin/new'
      }
    }));
  });
});
