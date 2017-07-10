const testHelper = require('../common/routing.helper');
let config = require('../../lib/config');
let originalGatewayConfig = config.gatewayConfig;

[undefined, 'sample.com', 'sub.acme.com'].forEach(host => {
  describe('pathRegex resolution for host:' + host, () => {
    let helper = testHelper();
    helper.addPolicy('test', () => (req, res) => {
      res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
    });

    before('setup', () => {
      config.gatewayConfig = {
        http: { port: 9086 },
        apiEndpoints: {
          test: { pathRegex: '/id-[0-9]{3}', host }
        },
        policies: ['test'],
        pipelines: {
          pipeline1: {
            apiEndpoints: ['test'],
            policies: { test: {} }
          }
        }
      };

      helper.setup();
    });

    after('cleanup', (done) => {
      helper.cleanup();
      config.gatewayConfig = originalGatewayConfig;
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
        result: 'test'
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
        result: 'test'
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
        result: 'test'
      }
    }));
  });
});
