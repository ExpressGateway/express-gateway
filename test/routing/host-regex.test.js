let helper = require('./routing.helper')();
let gatewayConfig = {
  http: { port: 9083 },
  apiEndpoints: {
    'parrots': { hostRegex: '[a-z]{3}.parrots.com' }
  },
  pipelines: {
    pipeline1: {
      apiEndpoints: ['parrots'],
      policies: [{ test: [{ action: { name: 'parrot_policy' } }] }]
    }
  }
};

describe("When configured to capture hostRegex: '[a-z]{3}.parrots.com'", () => {
  before('setup', helper.setup({
    fakeActions: ['parrot_policy'],
    gatewayConfig
  }));
  after('cleanup', helper.cleanup());
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
          result: 'parrot_policy'
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
          result: 'parrot_policy'
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
          result: 'parrot_policy'
        }
      }));
    });
  });
});
