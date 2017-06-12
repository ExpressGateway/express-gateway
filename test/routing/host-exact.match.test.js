 let testHelper = require('./routing.helper')
 let gatewayConfig = {
   http: { port: 9082 },
   apiEndpoints: {
     "test_domain": { "host": "acme.com" } // path defaults to *
   },
   pipelines: {
     pipeline1: {
       apiEndpoints: ['test_domain'],
       policies: { test: [{ action: { name: 'test_policy' } }] }
     }
   }
 };
 describe('exact host name configuration host:acme.com paths:default(*)', () => {
   let helper = testHelper();
   before('setup', helper.setup({
     fakeActions: ['test_policy'],
     gatewayConfig
   }))
   after('cleanup', helper.cleanup());
   it('should serve acme.com/', helper.validateSuccess({
     setup: {
       host: 'acme.com',
       url: '/'
     },
     test: {
       host: 'acme.com',
       url: '/',
       result: 'test_policy'
     }
   }));
   it('should serve acme.com', helper.validateSuccess({
     setup: {
       host: 'acme.com',
       url: ''
     },
     test: {
       host: 'acme.com',
       url: '/',
       result: 'test_policy'
     }
   }));
   it('should serve acme.com/pretty', helper.validateSuccess({
     setup: {
       host: 'acme.com',
       url: '/pretty'
     },
     test: {
       host: 'acme.com',
       url: '/pretty',
       result: 'test_policy'
     }
   }));
   it('should not load deep domain zx.abc.acme.com/', helper.validate404({
     setup: {
       host: 'zx.abc.acme.com',
       url: '/'
     }
   }));
   it('should not load deep domain abc.acme.com/', helper.validate404({
     setup: {
       host: 'abc.acme.com',
       url: '/'
     }
   }));
 })
