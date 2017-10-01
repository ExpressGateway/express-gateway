 const testHelper = require('../common/routing.helper');
 const config = require('../../lib/config');

 describe('exact host name configuration', () => {
   const helper = testHelper();
   let originalGatewayConfig;
   originalGatewayConfig = config.gatewayConfig;
   helper.addPolicy('test', () => (req, res) => {
     res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
   });

   before('setup', () => {
     config.gatewayConfig = {
       http: { port: 9084 },
       apiEndpoints: {
         'test_domain': { 'host': '*.acme.com' }, // path defaults to *
         'test_second_level_domain': { 'host': '*.*.example.com' } // path defaults to *
       },
       policies: ['test'],
       pipelines: {
         pipeline1: {
           apiEndpoints: ['test_domain', 'test_second_level_domain'],
           policies: { test: {} }
         }
       }
     };

     helper.setup();
   });

   after('cleanup', (done) => {
     helper.cleanup();
     config.gatewayConfig = originalGatewayConfig;
     done();
   });

   it('abc.acme.com/', helper.validateSuccess({
     setup: {
       host: 'abc.acme.com',
       url: '/'
     },
     test: {
       host: 'abc.acme.com',
       url: '/',
       result: 'test'
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
       result: 'test'
     }
   }));
   it('sub.abc.example.com', helper.validateSuccess({
     setup: {
       host: 'sub.abc.example.com',
       url: ''
     },
     test: {
       host: 'sub.abc.example.com',
       url: '/',
       result: 'test'
     }
   }));
   it('should not serve sub.abc.acme.com ', helper.validate404({
     setup: {
       host: 'sub.abc.acme.com',
       url: ''
     }
   }));
   it('should not serve abc.example.com ', helper.validate404({
     setup: {
       host: 'abc.example.com',
       url: ''
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
       result: 'test'
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
 });
