const testHelper = require('../../common/routing.helper');
const config = require('../../../lib/config');
const originalGatewayConfig = config.gatewayConfig;
const should = require('should');

describe('cors', () => {
  const helper = testHelper();
  helper.addPolicy('test', () => (req, res) => {
    res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
  });

  const setupHandler = (origin) => {
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
                  origin: origin,
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
  };

  describe('origin as string', () => {
    before('setup', () => {
      return setupHandler('http://www.example.com');
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

  describe('origin as regexp', () => {
    before('setup', () => {
      return setupHandler(/http:\/\/www\.example\.com/);
    });

    after('cleanup', () => {
      config.gatewayConfig = originalGatewayConfig;
      return helper.cleanup();
    });

    it('should have allow origin response header same as request origin when regexp matched', helper.validateOptions({
      setup: {
        origin: 'http://www.example.com',
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

    it('should have no allow origin response header when regexp didn\'t match', helper.validateOptions({
      setup: {
        origin: 'http://www.bad.com',
        url: '/',
        preflight: true
      },
      test: {
        url: '/',
        statusCode: 204,
        headers: {
          'access-control-allow-methods': 'HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-headers': 'X-TEST'
        },
        excludedHeaders: ['access-control-allow-origin']
      }
    }));
  });

  describe('origin as array of strings', () => {
    before('setup', () => {
      return setupHandler(['http://www.example.com', 'http://www.example2.com']);
    });

    after('cleanup', () => {
      config.gatewayConfig = originalGatewayConfig;
      return helper.cleanup();
    });

    it('should have allow origin response header same as request origin when any string item in array matched', helper.validateOptions({
      setup: {
        origin: 'http://www.example.com',
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

    it('should have no allow origin response header when none of the string items in the array matched the request origin', helper.validateOptions({
      setup: {
        origin: 'http://www.bad.com',
        url: '/',
        preflight: true
      },
      test: {
        url: '/',
        statusCode: 204,
        headers: {
          'access-control-allow-methods': 'HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-headers': 'X-TEST'
        },
        excludedHeaders: ['access-control-allow-origin']
      }
    }));
  });

  describe('origin as array of RegExp', () => {
    before('setup', () => {
      return setupHandler([/http:\/\/www\.example\.com/, /http:\/\/www\.example2\.com/]);
    });

    after('cleanup', () => {
      config.gatewayConfig = originalGatewayConfig;
      return helper.cleanup();
    });

    it('should have allow origin response header same as request origin when any RegExp item in array matched', helper.validateOptions({
      setup: {
        origin: 'http://www.example.com',
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

    it('should have no allow origin response header when none of the RegExp items in the array matched the request origin', helper.validateOptions({
      setup: {
        origin: 'http://www.bad.com',
        url: '/',
        preflight: true
      },
      test: {
        url: '/',
        statusCode: 204,
        headers: {
          'access-control-allow-methods': 'HEAD,PUT,PATCH,POST,DELETE',
          'access-control-allow-headers': 'X-TEST'
        },
        excludedHeaders: ['access-control-allow-origin']
      }
    }));
  });

  describe('origin as non regexp object', () => {
    after('cleanup', () => {
      config.gatewayConfig = originalGatewayConfig;
    });

    it('should throw exception when origin is an object but not regexp', () => {
      return should(setupHandler(() => { })).rejectedWith(/POLICY_PARAMS_VALIDATION_FAILED/);
    });
  });
});
