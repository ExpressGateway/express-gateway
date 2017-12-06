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
              res.json({ hello: 'ok', url: req.url, actionParams });
            };
          }
        }]
      },
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

describe('gateway policy schema with plugins', () => {
  let gatewaySrv;
  const helper = testHelper();

  afterEach('cleanup', () => {
    gatewaySrv.close();
    helper.cleanup();
  });

  it('should setup policy with valid schema', function () {
    return gateway({
      plugins: {
        policies: [{
          name: 'test-policy',
          schema: {
            type: 'object',
            properties: {
              p1: { type: ['number'] }
            },
            required: ['p1']
          },
          policy: function (actionParams) {
            return (req, res, next) => {
              assert(actionParams.p1, 42);
              res.json({ hello: 'ok', url: req.url, actionParams });
            };
          }
        }]
      },
      config
    }).then(srv => {
      helper.setupApp(srv.app);
      gatewaySrv = srv.app;
      return srv;
    });
  });

  it('should throw on policy schema validation', function () {
    config.gatewayConfig.policies.push('test-policy-2');
    config.gatewayConfig.pipelines.pipeline1.policies.push({
      'test-policy-2': [
        {
          action: {}
        }
      ]
    }
    );
    return assert.throws(() => gateway({
      plugins: {
        policies: [{
          name: 'test-policy-2',
          schema: {
            type: 'object',
            properties: {
              p2: { type: ['number'] }
            },
            required: ['p2']
          },
          policy: function () {
            assert.fail();
          }
        }]
      },
      config
    }));
  });
});
