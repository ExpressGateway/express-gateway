let mock = require('mock-require');
mock('redis', require('fakeredis'));

const testHelper = require('./routing.helper');
let config = require('../../lib/config');

describe('path resolution for specific and general domains', () => {
  let originalGatewayConfig = config.gatewayConfig;
  [undefined, 'example.com', 'sub.demo.com'].forEach(host => {
    let helper = testHelper();

    let configTemplate = {
      http: { port: 9085 },
      apiEndpoints: {
        test: { paths: undefined, host }
      },
      policies: ['test'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: { test: {} }
        }
      }
    };

    describe('paths configuration without wildcards paths:/admin host:' + host, () => {
      before('setup', () => {
        helper.addPolicy('test', () => (req, res) => {
          res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
        });
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin';
        helper.setup();
      });

      after('cleanup', (done) => {
        helper.cleanup();
        config.gatewayConfig = originalGatewayConfig;
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
            result: 'test'
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
      helper.addPolicy('test', () => (req, res) => {
        res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
      });

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin/*';
        helper.setup();
      });

      after('cleanup', (done) => {
        helper.cleanup();
        config.gatewayConfig = originalGatewayConfig;
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
            result: 'test'
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
      helper.addPolicy('test', () => (req, res) => {
        res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
      });

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin/:id';
        helper.setup();
      });

      after('cleanup', (done) => {
        helper.cleanup();
        config.gatewayConfig = originalGatewayConfig;
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
            result: 'test'
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
      helper.addPolicy('test', () => (req, res) => {
        res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
      });

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin/:group/:id';
        helper.setup();
      });

      after('cleanup', (done) => {
        helper.cleanup();
        config.gatewayConfig = originalGatewayConfig;
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
            result: 'test'
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
      helper.addPolicy('test', () => (req, res) => {
        res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
      });

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = ['/admin', '/admin/*'];
        helper.setup();
      });

      after('cleanup', (done) => {
        helper.cleanup();
        config.gatewayConfig = originalGatewayConfig;
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
            result: 'test'
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
