const testHelper = require('../../common/routing.helper');
const Config = require('../../../lib/config/config');
const fakeSessionProvider = require('../../common/session-provider');
const config = new Config();
const assert = require('assert');

describe('Functional Tests oAuth2.0 Policy', () => {
  const helper = testHelper();

  before('setup', () => {
    config.systemConfig = {
      db: {
        redis: { emulate: true }
      },
      session: {
        storeProvider: '../../../test/common/session-provider',
        storeOptions: { test: 45 },
        saveUninitialized: true,
        resave: true,
        secret: 'secret'
      }
    };
    config.gatewayConfig = {
      http: { port: 0 },
      serviceEndpoints: {
        backend: {
          url: 'http://localhost:6069'
        }
      },
      apiEndpoints: {
        api: {
          host: '*'
        }
      },
      policies: ['oauth2', 'proxy'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['api'],
          policies: [
            { oauth2: {} },
            { proxy: [{ action: { serviceEndpoint: 'backend' } }] }
          ]
        }
      }
    };
    return helper.setup({ config });
  });

  after('cleanup', () => {
    fakeSessionProvider.reset();
    return helper.cleanup();
  });

  it('should init session provider', function () {
    const opts = fakeSessionProvider.getOptions();
    assert.equal(opts.test, 45);
  });
});
