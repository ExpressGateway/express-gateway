let testHelper = require('./routing.helper')
let appConfig = {
  http: { port: 9081 },
  apiEndpoints: {
    test_default: {}
  },
  pipelines: {
    pipeline1: {
      apiEndpoints: ['test_default'],
      policies: { test: [{ action: { name: 'test_policy' } }] }
    }
  }
};

// there are several configuration ways to listen to all hosts
describe('When uses defaults (capture all hosts and paths)', () => {
  let helper = testHelper()
  before('setup', helper.setup({
    fakeActions: ['test_policy'],
    appConfig
  }))
  after('cleanup', helper.cleanup());

  ['/random/17/3', '/', '/admin'].forEach(url => {
    it('should serve for random host and random path: ' + url, helper.validateSuccess({
      setup: {
        host: 'zu.io',
        url
      },
      test: {
        host: 'zu.io',
        url,
        result: 'test_policy'
      }
    }))

    it('should serve for default host and path ' + url, helper.validateSuccess({
      setup: {
        host: undefined,
        url
      },
      test: {
        host: '127.0.0.1',
        url,
        result: 'test_policy'
      }
    }))
  })

})