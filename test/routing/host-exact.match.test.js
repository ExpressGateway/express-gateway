const testHelper = require('../common/routing.helper');
const config = require('../../lib/config');

describe('exact host name configuration host:acme.com paths:default(*)', () => {
  const helper = testHelper();
  helper.addPolicy('test', () => (req, res) => {
    res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
  });

  let originalGatewayConfig;
  before('setup', () => {
    originalGatewayConfig = config.gatewayConfig;

    config.gatewayConfig = {
      http: { port: 9082 },
      apiEndpoints: {
        'test_domain': { 'host': 'acme.com' } // path defaults to *
      },
      policies: ['test'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test_domain'],
          policies: { test: [] }
        }
      }
    };

    return helper.setup();
  });

  after('cleanup', () => {
    config.gatewayConfig = originalGatewayConfig;
    return helper.cleanup();
  });

  it('should serve acme.com/', helper.validateSuccess({
    setup: {
      host: 'acme.com',
      url: '/'
    },
    test: {
      host: 'acme.com',
      url: '/',
      result: 'test'
    }
  }));
  it('should serve acme.com', helper.validateSuccess({
    setup: {
      host: 'acme.com',
      url: ''
    },
    test: {
      host: 'acme.com',
      url: '/',
      result: 'test'
    }
  }));
  it('should serve acme.com/pretty', helper.validateSuccess({
    setup: {
      host: 'acme.com',
      url: '/pretty'
    },
    test: {
      host: 'acme.com',
      url: '/pretty',
      result: 'test'
    }
  }));
  it('should not load deep domain zx.abc.acme.com/', helper.validate404({
    setup: {
      host: 'zx.abc.acme.com',
      url: '/'
    }
  }));
  it('should not load deep domain abc.acme.com/', helper.validate404({
    setup: {
      host: 'abc.acme.com',
      url: '/'
    }
  }));
});
