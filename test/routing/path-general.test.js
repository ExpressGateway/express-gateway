const testHelper = require('./routing.helper');
let config = require('../../src/config');

describe('path resolution for specific and general domains', () => {
  let originalGatewayConfig = config.gatewayConfig;
  [undefined, 'example.com', 'sub.demo.com'].forEach(host => {
    let configTemplate = {
      http: { port: 9085 },
      apiEndpoints: {
        test: { paths: undefined, host }
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: [{ test: [{ action: { name: 'test_policy' } }] }]
        }
      }
    };
    describe('paths configuration without wildcards paths:/admin host:' + host, () => {
      let helper = testHelper();

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin';
        helper.setup({ fakeActions: ['test_policy'] })();
      });

      after('cleanup', (done) => {
        config.gatewayConfig = originalGatewayConfig;
        helper.cleanup();
        done();
      });

      ['/admin/', '/admin'].forEach(function (url) {
        it('should serve exact matched url', helper.validateSuccess({
          setup: {
            host,
            url
          },
          test: {
            host,
            url,
            result: 'test_policy'
          }
        }));
      });

      ['/admin/new', '/student', '/admin/new/1', '/adm'].forEach(function (url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }));
      });
    });

    describe('paths configuration with  /admin/*', () => {
      let helper = testHelper();

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin/*';
        helper.setup({ fakeActions: ['test_policy'] })();
      });

      after('cleanup', (done) => {
        config.gatewayConfig = originalGatewayConfig;
        helper.cleanup();
        done();
      });

      ['/admin/new', '/admin/new/1', '/admin/', '/admin/new/1/test'].forEach(function (url) {
        it('should serve matched url: ' + url, helper.validateSuccess({
          setup: {
            host,
            url
          },
          test: {
            host,
            url,
            result: 'test_policy'
          }
        }));
      });

      ['/student', '/adm', '/admin'].forEach(function (url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }));
      });
    });

    describe('paths with one named parameter /admin/:id', () => {
      let helper = testHelper();

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin/:id';
        helper.setup({ fakeActions: ['test_policy'] })();
      });

      after('cleanup', (done) => {
        config.gatewayConfig = originalGatewayConfig;
        helper.cleanup();
        done();
      });

      ['/admin/new', '/admin/4040040', '/admin/1'].forEach(function (url) {
        it('should serve matched url: ' + url, helper.validateSuccess({
          setup: {
            host,
            url
          },
          test: {
            host,
            url,
            result: 'test_policy'
          }
        }));
      });

      [ '/student', '/adm', '/admin', '/admin/', '/admin/1/rt' ].forEach(function (url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }));
      });
    });

    describe('paths with one named parameter /admin/:group/:id', () => {
      let helper = testHelper();

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin/:group/:id';
        helper.setup({ fakeActions: ['test_policy'] })();
      });

      after('cleanup', (done) => {
        config.gatewayConfig = originalGatewayConfig;
        helper.cleanup();
        done();
      });

      ['/admin/new/1'].forEach(function (url) {
        it('should serve matched url: ' + url, helper.validateSuccess({
          setup: {
            host,
            url
          },
          test: {
            host,
            url,
            result: 'test_policy'
          }
        }));
      });

      ['/admin', '/admin/', '/admin/1', '/admin/1/5/6'].forEach(function (url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }));
      });
    });

    describe('paths configuration with wildcard after slash or directory ["/admin","/admin/*"]', () => {
      let helper = testHelper();

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = ['/admin', '/admin/*'];
        helper.setup({ fakeActions: ['test_policy'] })();
      });

      after('cleanup', (done) => {
        config.gatewayConfig = originalGatewayConfig;
        helper.cleanup();
        done();
      });

      ['/admin', '/admin/new', '/admin/', '/admin/new/1', '/admin/new/1/test'].forEach(function (url) {
        it('should serve matched url: ' + url, helper.validateSuccess({
          setup: {
            host,
            url
          },
          test: {
            host,
            url,
            result: 'test_policy'
          }
        }));
      });

      ['/student', '/adm', '/'].forEach(function (url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }));
      });
    });
  });
});
