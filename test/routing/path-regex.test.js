const testHelper = require('./routing.helper');
[undefined, 'sample.com', 'sub.acme.com'].forEach(host => {
  describe('pathRegex resolution for host:' + host, () => {
    let helper = testHelper();
    let gatewayConfig = {
      http: { port: 9086 },
      apiEndpoints: {
        test: { pathRegex: '/id-[0-9]{3}', host }
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: [{ test: [{ action: { name: 'test_policy' } }] }]
        }
      }
    };
    before('setup', helper.setup({
      fakeActions: ['test_policy'],
      gatewayConfig: gatewayConfig
    }));
    after('cleanup', helper.cleanup());
    it('mathing regex animals.com/id-123', helper.validateSuccess({
      setup: {
        host,
        url: '/id-123'
      },
      test: {
        host,
        url: '/id-123',
        result: 'test_policy'
      }
    }));
    it('mathing regex animals.com/id-123/', helper.validateSuccess({
      setup: {
        host,
        url: '/id-123/'
      },
      test: {
        host,
        url: '/id-123/',
        result: 'test_policy'
      }
    }));
    it('mathing regex animals.com/id-123/cat', helper.validateSuccess({
      setup: {
        host,
        url: '/id-123/cat'
      },
      test: {
        host,
        url: '/id-123/cat',
        result: 'test_policy'
      }
    }));
  });
});
