let testHelper = require('./routing.helper')
let appConfig = {
  http: { port: 9089 },
  apiEndpoints: {
    test_default: {
      scopes: [
        { scope: 'admin', verbs: 'GET' },
        { scope: 'profile', verbs: ['GET', 'POST'] }
      ]
    }
  },
  pipelines: {
    pipeline1: {
      apiEndpoints: ['test_default'],
      policies: { test: [{ action: { name: 'test_policy' } }] }
    }
  }
};

describe('When scopes defined for apiEndpoint', () => {
  let helper = testHelper()
  before('setup', helper.setup({
    fakeActions: ['test_policy'],
    appConfig
  }))
  after('cleanup', helper.cleanup())
  it('should set scopes to egContext', helper.validateSuccess({
    setup: {
      url: '/'
    },
    test: {
      url: '/',
      scopes: appConfig.apiEndpoints.test_default.scopes
    }
  }))

})