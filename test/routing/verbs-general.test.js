const testHelper = require('./routing.helper');
[undefined, 'sample.com', 'sub.acme.com'].forEach(host => {
  describe('verb matching for host:' + host, () => {
    let helper = testHelper();
    let appConfig = {
      http: { port: 9087 },
      apiEndpoints: {
        test: { host, verbs: ['POST'] }
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: [{ action: { name: 'test_policy' } }]
        }
      }
    };
    before('setup', helper.setup({
      fakeActions: ['test_policy'],
      appConfig: appConfig
    }))
    after('cleanup', helper.cleanup())

    it('should not GET when disabled', helper.validate404({
      setup: {
        host,
        url: '/'
      }
    }))
    it('should POST when enabled', helper.validateSuccess({
      setup: {
        host,
        url: '/',
        postData: {}
      },
      test: {
        host,
        url: '/',
        result: 'test_policy'
      }
    }))
  })
})