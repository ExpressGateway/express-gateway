const testHelper = require('../../common/routing.helper');
const Config = require('../../../lib/config/config');
const helper = testHelper();

describe('@terminate', () => {
  before('setup', () => {
    const config = new Config();
    const configTemplate = {
      http: { port: 0 },
      apiEndpoints: {
        test: { paths: '*' }
      },
      policies: ['terminate'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: [{
            terminate: [{
              action: {
                statusCode: 429
              }
            }]
          }]
        }
      }
    };
    config.gatewayConfig = configTemplate;
    helper.setup({ config });
  });

  after('cleanup', (done) => {
    helper.cleanup();
    done();
  });

  it('should terminate: ', helper.validateError({
    setup: {
      url: '/'
    },
    test: {
      result: 'test',
      errorCode: 429
    }
  }));
});
