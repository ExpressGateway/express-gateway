const mock = require('mock-require');
mock('redis', require('fakeredis'));

const testHelper = require('../common/routing.helper');
const Config = require('../../lib/config/config');
describe('path resolution for specific and general domains', () => {
  const config = new Config();
  [undefined, 'example.com', 'sub.demo.com'].forEach(host => {
    const configTemplate = {
      http: { port: 9085 },
      apiEndpoints: {
        test: { paths: undefined, host }
      },
      policies: ['routeTest'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: { routeTest: {} }
        }
      }
    };

    describe('paths configuration without wildcards paths:/admin host:' + host, () => {
      const helper = testHelper();
      before('setup', () => {
        const plugins = {policies: [{
          name: 'routeTest',
          policy: () => (req, res) => {
            res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
          }
        }]};
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin';
        helper.setup({config, plugins});
      });

      after('cleanup', (done) => {
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
      const helper = testHelper();
      const plugins = {policies: [{name: 'routeTest',
        policy: () => (req, res) => {
          res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
        }}]};

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin/*';
        helper.setup({config, plugins});
      });

      after('cleanup', (done) => {
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
      const helper = testHelper();
      const plugins = {policies: [{name: 'routeTest',
        policy: () => (req, res) => {
          res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
        }}]};

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin/:id';
        helper.setup({config, plugins});
      });

      after('cleanup', (done) => {
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
      const helper = testHelper();
      const plugins = {policies: [{name: 'routeTest',
        policy: () => (req, res) => {
          res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
        }}]};

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = '/admin/:group/:id';
        helper.setup({config, plugins});
      });

      after('cleanup', (done) => {
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
      const helper = testHelper();
      const plugins = {policies: [{name: 'routeTest',
        policy: () => (req, res) => {
          res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
        }}]};

      before('setup', () => {
        config.gatewayConfig = configTemplate;
        config.gatewayConfig.apiEndpoints.test.paths = ['/admin', '/admin/*'];
        helper.setup({config, plugins});
      });

      after('cleanup', (done) => {
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
