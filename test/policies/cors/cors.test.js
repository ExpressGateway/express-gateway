const testHelper = require('../../common/routing.helper');
const config = require('../../../lib/config');
const originalGatewayConfig = config.gatewayConfig;

describe('cors', () => {
  const helper = testHelper();
  helper.addPolicy('test', () => (req, res) => {
    res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
  });

  before('setup', () => {
    config.gatewayConfig = {
      http: { port: 0 },
      apiEndpoints: {
        test_default: {}
      },
      policies: ['cors', 'test'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test_default'],
          policies: [
            {
              cors: {
                action: {
                  origin: 'http://www.example.com',
                  methods: 'HEAD,PUT,PATCH,POST,DELETE',
                  allowedHeaders: 'X-TEST'
                }
              }
            },
            {
              test: []
            }
          ]
        }
      }
    };

    return helper.setup();
  });

  after('cleanup', () => {
    config.gatewayConfig = originalGatewayConfig;
    return helper.cleanup();
  });

  it('should allow first request for host', helper.validateOptions({
    setup: {
      url: '/',
      preflight: true
    },
    test: {
      url: '/',
      statusCode: 204,
      headers: {
        'access-control-allow-origin': 'http://www.example.com',
        'access-control-allow-methods': 'HEAD,PUT,PATCH,POST,DELETE',
        'access-control-allow-headers': 'X-TEST'
      }
    }
  }));
});
