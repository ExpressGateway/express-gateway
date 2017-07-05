let testHelper = require('./routing.helper');
let config = require('../../lib/config');
let sinon = require('sinon');
let assert = require('assert');
// there are several configuration ways to listen to all hosts
describe('default config with multi step (multi action) policy', () => {
  let helper = testHelper();
  let originalGatewayConfig;
  let spy = sinon.spy();
  let handler = (req, res, next) => {
    spy();
    next();
  };
  before('setup', () => {
    originalGatewayConfig = config.gatewayConfig;

    config.gatewayConfig = {
      http: { port: 9233 },
      apiEndpoints: {
        test_default: {}
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test_default'],
          policies: [{
            test: [{
              action: { name: 'test_action' }  // this is just a spy, counting calls
            }, {
              action: { name: 'test_action' }  // this is just a spy, counting calls
            }, {
              action: { name: 'test_action2' } // this will return JSON result
            }]
          }]
        }
      }
    };
    helper.registerAction({
      name: 'test_action',
      handler
    });
    helper.setup({ fakeActions: ['test_action2'] })();
  });

  after('cleanup', (done) => {
    config.gatewayConfig = originalGatewayConfig;
    helper.cleanup();
    done();
  });
  beforeEach('reset', () => {
    spy.reset();
  });

  ['/random/17/3', '/', '/admin'].forEach(url => {
    it('should execute 2 policy steps for random host/path: ' + url, done => {
      helper.validateSuccess({
        setup: {
          host: 'zu.io',
          url
        },
        test: {
          host: 'zu.io',
          url,
          result: 'test_action2'
        }
      })(err => {
        assert(spy.calledTwice); // two intermediate policy steps called + the one returned result
        done(err);
      });
    });
  });
});
