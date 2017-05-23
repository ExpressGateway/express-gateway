const testHelper = require('./routing.helper')
const _ = require('lodash');

describe('path resolution for specific and general domains', () => {
  [undefined, 'example.com', 'sub.demo.com'].forEach(host => {
    let configTemplate = {
      http: { port: 9085 },
      apiEndpoints: {
        test: { paths: '', host }
      },
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: [{ action: { name: 'test_policy' } }]
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
      after('cleanup', helper.cleanup())
      it('should serve exact matched url', helper.validateSuccess({
        setup: {
          host,
          url: '/admin'
        },
        test: {
          host,
          url: '/admin',
          result: 'test_policy'
        }
      }));

      ['/admin/', '/admin/new', '/student', '/admin/new/1', '/adm'].forEach(function(url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }))
      });
    })

    describe('paths configuration with single wildcard after slash (1 level nesting) paths:/admin/* host:' + host, () => {
      // paths: /admin/*
      // will serve any requests in folder /admin/new etc.
      // will not serve folder itself /admin
      // will not serve deep levels /admin/new/1 /admin/new/1/test

      let helper = testHelper();
      let appConfig = _.cloneDeep(configTemplate);
      appConfig.apiEndpoints.test.paths = '/admin/*'
      before('setup', helper.setup({
        fakeActions: ['test_policy'],
        appConfig
      }))
      after('cleanup', helper.cleanup());

      ['/admin/new'].forEach(function(url) {
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

      ['/admin', '/student', '/admin/new/1', '/adm', '/admin/'].forEach(function(url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }))
      });
    })

    describe('paths configuration with double wildcards after slash (multi level nesting) paths:/admin/**', () => {
      let helper = testHelper();
      let appConfig = _.cloneDeep(configTemplate);
      appConfig.apiEndpoints.test.paths = '/admin/**'
      before('setup', helper.setup({
        fakeActions: ['test_policy'],
        appConfig
      }))
      after('cleanup', helper.cleanup());

      ['/admin/new', '/admin/', '/admin/new/1', '/admin/new/1/test'].forEach(function(url) {
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

      ['/admin', '/student', '/adm'].forEach(function(url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }))
      });
    })

    describe('paths configuration with double wildcards after slash or slash /{admin,admin/**}', () => {
      let helper = testHelper();
      let appConfig = _.cloneDeep(configTemplate);
      appConfig.apiEndpoints.test.paths = '/{admin,admin/**}'
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

      ['/student', '/adm'].forEach(function(url) {
        it('should not serve  url: ' + url, helper.validate404({
          setup: {
            host,
            url
          }
        }))
      });
    })

    describe('paths configuration with double wildcards after slash or slash ["/admin","/admin/**"]', () => {
      let helper = testHelper();
      let appConfig = _.cloneDeep(configTemplate);
      appConfig.apiEndpoints.test.paths = ['/admin', '/admin/**']
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

      ['/student', '/adm'].forEach(function(url) {
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