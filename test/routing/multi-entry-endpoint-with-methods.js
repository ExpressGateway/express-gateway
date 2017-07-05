let testHelper = require('./routing.helper');
let config = require('../../lib/config');

describe('Multi entry api endpoint with methods', () => {
  let helper = testHelper();
  let originalGatewayConfig = config.gatewayConfig;

  before('setup', () => {
    config.gatewayConfig = {
      http: { port: 9081 },
      apiEndpoints: {
        api: [{ // Contains 2 entries with different configs
          pathRegex: '/wild-cats$',
          methods: 'POST,PUT' // comma separated string syntax
        }, {
          paths: '/admin',
          methods: ['PUT'] // array syntax
        }]
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['api'],
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

  it('should serve POST when pathRegex matched', helper.validateSuccess({
    setup: {
      url: '/wild-cats',
      postData: {}
    },
    test: {
      host: '127.0.0.1',
      url: '/wild-cats',
      result: 'test_policy'
    }
  }));
  it('should serve PUT when pathRegex matched', helper.validateSuccess({
    setup: {
      url: '/wild-cats',
      putData: {}
    },
    test: {
      host: '127.0.0.1',
      url: '/wild-cats',
      result: 'test_policy'
    }
  }));

  it('should not serve GET even when pathRegex matched', helper.validate404({
    setup: {
      url: '/wild-cats'
    }
  }));
  it('should 404 when regexPath not matched but method matches', helper.validate404({
    setup: {
      url: '/wild-cats2',
      postData: {}
    }
  }));

  it('should serve PUT when path matched', helper.validateSuccess({
    setup: {
      url: '/admin',
      putData: {}
    },
    test: {
      host: '127.0.0.1',
      url: '/admin',
      result: 'test_policy'
    }
  }));
  it('should not serve POST when path matched', helper.validate404({
    setup: {
      url: '/admin',
      postData: {}
    }
  }));
  it('should not serve GET when path matched', helper.validate404({
    setup: {
      url: '/admin'
    }
  }));
  it('should 404 for default host and path not matched', helper.validate404({
    setup: {
      url: '/admin/new'
    }
  }));
});
