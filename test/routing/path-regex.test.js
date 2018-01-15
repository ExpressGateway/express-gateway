const testHelper = require('../common/routing.helper');
const Config = require('../../lib/config/config');

[undefined, 'sample.com', 'sub.acme.com'].forEach(host => {
  describe('pathRegex resolution for host:' + host, () => {
    const helper = testHelper();
    const config = new Config();
    const plugins = {
      policies: [{
        name: 'testRegex',
        policy: () => (req, res) => {
          res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
        }
      }]
    };

    before('setup', () => {
      config.gatewayConfig = {
        http: { port: 0 },
        apiEndpoints: {
          test: { pathRegex: '/id-[0-9]{3}', host }
        },
        policies: ['testRegex'],
        pipelines: {
          pipeline1: {
            apiEndpoints: ['test'],
            policies: { testRegex: {} }
          }
        }
      };

      return helper.setup({ config, plugins });
    });

    after('cleanup', helper.cleanup);

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
