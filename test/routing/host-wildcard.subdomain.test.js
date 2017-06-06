 let testHelper = require('./routing.helper')
 let appConfig = {
   http: { port: 9084 },
   apiEndpoints: {
     "test_domain": { "host": "*.acme.com" } // path defaults to /**
   },
   pipelines: {
     pipeline1: {
       apiEndpoints: ['test_domain'],
       policies: { test: [{ action: { name: 'test_policy' } }] }
     }
   }
 };
 describe('exact host name configuration', () => {
   let helper = testHelper();
   before('setup', helper.setup({
     fakeActions: ['test_policy'],
     appConfig
   }))
   after('cleanup', helper.cleanup());
   it('abc.acme.com/', helper.validateSuccess({
     setup: {
       host: 'abc.acme.com',
       url: '/'
     },
     test: {
       host: 'abc.acme.com',
       url: '/',
       result: 'test_policy'
     }
   }));

   it('abc.acme.com', helper.validateSuccess({
     setup: {
       host: 'abc.acme.com',
       url: ''
     },
     test: {
       host: 'abc.acme.com',
       url: '/',
       result: 'test_policy'
     }
   }));
   it('abc.acme.com/pretty', helper.validateSuccess({
     setup: {
       host: 'abc.acme.com',
       url: '/pretty'
     },
     test: {
       host: 'abc.acme.com',
       url: '/pretty',
       result: 'test_policy'
     }
   }));
   it('should not load root domain acme.com/', helper.validate404({
     setup: {
       host: 'acme.com',
       url: '/'
     }
   }));
   it('should not load deep domain zx.abc.acme.com/', helper.validate404({
     setup: {
       host: 'zx.abc.acme.com',
       url: '/'
     }
   }));
 })