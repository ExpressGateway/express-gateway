let adminHelper = require('../common/admin-helper')();
let testHelper = require('../common/routing.helper');
const Config = require('../../lib/config/config');

describe('admin server built-in cors', () => {
  let config = new Config();
  let helper = testHelper();
  before('setup', () => {
    config.gatewayConfig = {
      http: { port: 0 },
      admin: {
        port: 0,
        cors: {
          origin: 'http://www.example.com',
          methods: 'HEAD,PUT,PATCH,POST,DELETE',
          allowedHeaders: 'X-TEST'
        }
      }

    };
    return adminHelper.start({config}).then(adminApp => {
      helper.setupApp(adminApp);
    });
  });

  after(() => {
    return adminHelper.stop();
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
