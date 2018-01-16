const testHelper = require('../common/routing.helper');
const config = require('../../lib/config');

describe('Multi entry api endpoint with default host', () => {
  const helper = testHelper();
  const originalGatewayConfig = config.gatewayConfig;
  helper.addPolicy('test', () => (req, res) => {
    res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
  });

  before('setup', () => {
    config.gatewayConfig = {
      http: { port: 9081 },
      apiEndpoints: {
        api: [{ // Contains 2 entries with different configs
          pathRegex: '/wild-cats$'
        }, {
          paths: '/admin'
        }]
      },
      policies: ['test'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['api'],
          policies: { test: {} }
        }
      }
    };

    return helper.setup();
  });

  after('cleanup', () => {
    config.gatewayConfig = originalGatewayConfig;
    return helper.cleanup();
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
