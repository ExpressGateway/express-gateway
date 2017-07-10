let mock = require('mock-require');
mock('redis', require('fakeredis'));

let testHelper = require('../common/routing.helper');
let config = require('../../lib/config');
let sinon = require('sinon');
let assert = require('assert');
// there are several configuration ways to listen to all hosts
describe('default config with multi step (multi action) policy', () => {
  let originalGatewayConfig = config.gatewayConfig;
  let helper = testHelper();
  let spy = sinon.spy();
  let handler = (params) => (req, res, next) => {
    spy(params);
    next();
  };

  before('setup', () => {
    helper.addPolicy('test', handler);
    helper.addPolicy('test-return', () => (req, res) => {
      res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
    });

    config.gatewayConfig = {
      http: { port: 9233 },
      apiEndpoints: {
        test_default: {}
      },
      policies: [ 'test', 'test-return' ],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test_default'],
          policies: [
            {
              test: [{
                action: { param: 1 }
              }, {
                action: { param: 2 }
              }, {
                action: { param: 3 }
              }]
            },
            { 'test-return': null }
          ]
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
          result: 'test'
        }
      })((err) => {
        assert(spy.calledThrice);
        assert(spy.calledWith({ param: 1 }));
        assert(spy.calledWith({ param: 2 }));
        assert(spy.calledWith({ param: 3 }));
        done(err);
      });
    });
  });
});
