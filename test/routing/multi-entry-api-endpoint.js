let testHelper = require('../common/routing.helper');
let config = require('../../lib/config');

describe('Multi entry api endpoint with default host', () => {
  let helper = testHelper();
  let originalGatewayConfig = config.gatewayConfig;
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

    helper.setup();
  });

  after('cleanup', (done) => {
    config.gatewayConfig = originalGatewayConfig;
    helper.cleanup();
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
