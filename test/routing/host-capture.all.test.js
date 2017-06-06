let testHelper = require('./routing.helper')
let appConfig = {
  http: { port: 9081 },
  apiEndpoints: {
    test_regex: { pathRegex: "/wild-cats$" },
    test_path: { paths: "/admin" }
  },
  pipelines: {
    pipeline1: {
      apiEndpoints: ['test_regex', 'test_path'],
      policies: { test: [{ action: { name: 'test_policy' } }] }
    }
  }
};

// there are several configuration ways to listen to all hosts
['*', '', undefined].forEach(hostBind => {
  describe('When configured to capture all hosts with config host:' + hostBind, () => {
    let helper = testHelper()
    appConfig.apiEndpoints.test_regex.host = hostBind
    appConfig.apiEndpoints.test_path.host = hostBind
    before('setup', helper.setup({
      fakeActions: ['test_policy'],
      appConfig
    }))
    after('cleanup', helper.cleanup())
    it('should serve for random host and pathRegex matched', helper.validateSuccess({
      setup: {
        host: 'zu.io',
        url: '/wild-cats'
      },
      test: {
        host: 'zu.io',
        url: '/wild-cats',
        result: 'test_policy'
      }
    }))

    it('should serve for default host and pathRegex matched', helper.validateSuccess({
      setup: {
        host: undefined,
        url: '/wild-cats'
      },
      test: {
        host: '127.0.0.1',
        url: '/wild-cats',
        result: 'test_policy'
      }
    }))
    it('should 404 for default host + regexPath not matched', helper.validate404({
      setup: {
        url: '/wild-cats2'
      }
    }))

    it('should serve for default host + path matched', helper.validateSuccess({
      setup: {
        url: '/admin'
      },
      test: {
        host: '127.0.0.1',
        url: '/admin',
        result: 'test_policy'
      }
    }))
    it('should 404 for default host and path not matched', helper.validate404({
      setup: {
        url: '/admin/new'
      }
    }))
  })
})