let testHelper = require('./routing.helper');
let config = require('../../lib/config');

describe("When configured to capture hostRegex: '[a-z]{3}.parrots.com'", () => {
  let originalGatewayConfig;
  let helper = testHelper();
  helper.addPolicy('test', () => (req, res) => {
    res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
  });

  before('setup', () => {
    originalGatewayConfig = config.gatewayConfig;

    config.gatewayConfig = {
      http: { port: 9083 },
      apiEndpoints: {
        'parrots': { hostRegex: '[a-z]{3}.parrots.com' }
      },
      policies: ['test'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['parrots'],
          policies: { test: [] }
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

  describe('regex host name configuration /[a-z]{3}.parrots.com/', () => {
    describe('should not load root domain parrots.com', () => {
      it('parrots.com/', helper.validate404({
        setup: {
          host: 'parrots.com',
          url: '/'
        }
      }));
      it('parrots.com', helper.validate404({
        setup: {
          host: 'parrots.com',
          url: ''
        }
      }));
      it('parrots.com/pretty', helper.validate404({
        setup: {
          host: 'parrots.com',
          url: '/pretty'
        }
      }));
    });
    describe('should not load subdomain not matching regexp', () => {
      it('parrots.com/', helper.validate404({
        setup: {
          host: '1234.parrots.com',
          url: '/'
        }
      }));
      it('parrots.com', helper.validate404({
        setup: {
          host: '1234.parrots.com',
          url: ''
        }
      }));
      it('parrots.com/pretty', helper.validate404({
        setup: {
          host: '1234.parrots.com',
          url: '/pretty'
        }
      }));
    });

    describe('should load subdomain matching regexp abc.parrots.com', () => {
      it('abc.parrots.com/', helper.validateSuccess({
        setup: {
          host: 'abc.parrots.com',
          url: '/'
        },
        test: {
          host: 'abc.parrots.com',
          url: '/',
          result: 'test'
        }
      }));
      it('abc.parrots.com', helper.validateSuccess({
        setup: {
          host: 'abc.parrots.com',
          url: ''
        },
        test: {
          host: 'abc.parrots.com',
          url: '/',
          result: 'test'
        }
      }));
      it('abc.parrots.com/pretty', helper.validateSuccess({
        setup: {
          host: 'abc.parrots.com',
          url: '/pretty'
        },
        test: {
          host: 'abc.parrots.com',
          url: '/pretty',
          result: 'test'
        }
      }));
    });
  });
});
