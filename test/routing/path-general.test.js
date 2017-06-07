const testHelper = require('./routing.helper')
const _ = require('lodash');

describe('path resolution for specific and general domains', () => {
  [undefined, 'example.com', 'sub.demo.com'].forEach(host => {
    let configTemplate = {
      http: { port: 9085 },
      apiEndpoints: {
        test: { paths: undefined, host }
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: { test: [{ action: { name: 'test_policy' } }] }
        }
      }
    };
    describe('paths configuration without wildcards paths:/admin host:' + host, () => {
      let helper = testHelper();
      let appConfig = _.cloneDeep(configTemplate);
      appConfig.apiEndpoints.test.paths = '/admin'

      before('setup', helper.setup({
        fakeActions: ['test_policy'],
        appConfig
      }))
      after('cleanup', helper.cleanup());

      ['/admin/', '/admin'].forEach(function(url) {
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

      ['/admin/new', '/student', '/admin/new/1', '/adm'].forEach(function(url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }))
      });
    })

    describe('paths configuration with  /admin/*', () => {
      let helper = testHelper();
      let appConfig = _.cloneDeep(configTemplate);
      appConfig.apiEndpoints.test.paths = '/admin/*'
      before('setup', helper.setup({
        fakeActions: ['test_policy'],
        appConfig
      }))
      after('cleanup', helper.cleanup());

      ['/admin/new', '/admin/new/1', '/admin/', '/admin/new/1/test'].forEach(function(url) {
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

      ['/student', '/adm', '/admin'].forEach(function(url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }))
      });
    })


    describe('paths with one named parameter /admin/:id', () => {
      let helper = testHelper();
      let appConfig = _.cloneDeep(configTemplate);
      appConfig.apiEndpoints.test.paths = '/admin/:id'
      before('setup', helper.setup({
        fakeActions: ['test_policy'],
        appConfig
      }))
      after('cleanup', helper.cleanup());

      ['/admin/new', '/admin/4040040', '/admin/1'].forEach(function(url) {
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

      ['/student', '/adm', '/admin', '/admin/', '/admin/1/rt', ].forEach(function(url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }))
      });
    })

    describe('paths with one named parameter /admin/:group/:id', () => {
      let helper = testHelper();
      let appConfig = _.cloneDeep(configTemplate);
      appConfig.apiEndpoints.test.paths = '/admin/:group/:id'
      before('setup', helper.setup({
        fakeActions: ['test_policy'],
        appConfig
      }))
      after('cleanup', helper.cleanup());

      ['/admin/new/1'].forEach(function(url) {
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

      ['/admin', '/admin/', '/admin/1', '/admin/1/5/6'].forEach(function(url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }))
      });
    })

    describe('paths configuration with wildcard after slash or slash ["/admin","/admin/*"]', () => {
      let helper = testHelper();
      let appConfig = _.cloneDeep(configTemplate);
      appConfig.apiEndpoints.test.paths = ['/admin', '/admin/*']
      before('setup', helper.setup({
        fakeActions: ['test_policy'],
        appConfig
      }))
      after('cleanup', helper.cleanup());

      ['/admin', '/admin/new', '/admin/', '/admin/new/1', '/admin/new/1/test'].forEach(function(url) {
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

      ['/student', '/adm', '/'].forEach(function(url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }))
      });
    })
  })
})