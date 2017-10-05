const assert = require('chai').assert;
const gateway = require('../../lib/gateway');
const Config = require('../../lib/config/config');
const testHelper = require('../common/routing.helper');

const config = new Config();
config.gatewayConfig = {
  http: {
    port: 0
  },
  apiEndpoints: {
    test_default: {
      host: '*',
      paths: ['/*']
    }
  },
  policies: ['test-policy'],
  pipelines: {
    pipeline1: {
      apiEndpoints: ['test_default'],
      policies: [
        {
          'test-policy': [
            {
              action: {
                p1: 42
              }
            }
          ]
        }
      ]
    }
  }
};

describe('gateway policy with plugins', () => {
  let gatewaySrv;
  const helper = testHelper();

  before('fires up a new gateway instance', function () {
    return gateway({
      plugins: {
        policies: [{
          name: 'test-policy',
          policy: function (actionParams) {
            return (req, res, next) => {
              assert(actionParams.p1, 42);
              res.json({hello: 'ok', url: req.url, actionParams});
            };
          }
        }]},
      config
    }).then(srv => {
      helper.setupApp(srv.app);
      gatewaySrv = srv.app;
      return srv;
    });
  });

  after('cleanup', () => {
    helper.cleanup();
  });

  it('should allow first request for host', helper.validateSuccess({
    setup: {
      url: '/',
      preflight: true
    },
    test: {
      url: '/'
    }
  }));

  after('close gateway srv', () => {
    gatewaySrv.close();
  });
});
