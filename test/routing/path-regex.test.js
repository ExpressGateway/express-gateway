const testHelper = require('./routing.helper');
let config = require('../../lib/config');
let originalGatewayConfig = config.gatewayConfig;

[undefined, 'sample.com', 'sub.acme.com'].forEach(host => {
  describe('pathRegex resolution for host:' + host, () => {
    let helper = testHelper();

    before('setup', () => {
      config.gatewayConfig = {
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

      helper.setup({ fakeActions: ['test_policy'] })();
    });

    after('cleanup', (done) => {
      config.gatewayConfig = originalGatewayConfig;
      helper.cleanup();
      done();
    });

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
