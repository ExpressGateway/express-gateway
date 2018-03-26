const httpProxy = require('http-proxy');
const http = require('http');
const assert = require('assert');
const request = require('superagent');
const gwHelper = require('../common/gateway.helper');
const cliHelper = require('../common/cli.helper');

describe('@e2e @proxy through proxy', () => {
  const gatewayConfig = {
    apiEndpoints: {
      api: {
        path: '/test'
      }
    },
    policies: ['proxy'],
    pipelines: {
      pipeline1: {
        apiEndpoints: ['api'],
        policies: [{
          proxy: {
            action: { serviceEndpoint: 'backend' }
          }
        }]
      }
    }
  };

  const proxiedUrls = {};
  let gw;
  let proxy;
  let srv;

  before('init', (done) => {
    cliHelper.bootstrapFolder().then(dirInfo => {
      proxy = httpProxy.createProxyServer({ changeOrigin: true });

      srv = http.createServer(function (req, res) {
        proxiedUrls[req.url] = true;
        proxy.web(req, res, { target: req.url });
      });

      const server = srv.listen(0, (err) => {
        if (err) {
          return done(err);
        }

        process.env.HTTP_PROXY = `http://localhost:${server.address().port}`;
        gwHelper.startGatewayInstance({ dirInfo, gatewayConfig }).then(({ gatewayProcess }) => {
          gw = gatewayProcess;
          done();
        }).catch(done);
      });
    });
  });

  after('cleanup', (done) => {
    delete process.env.HTTP_PROXY;
    gw.kill();
    proxy.close();
    srv.close(done);
  });

  it('should respect HTTP_PROXY env var and send through proxy', () => {
    return request
      .get(`http://localhost:${gatewayConfig.http.port}/test`)
      .then((res) => {
        assert.ok(res.text);
        // we need to ensure that request went through proxy, not directly
        assert.ok(proxiedUrls[`${gatewayConfig.serviceEndpoints.backend.url}/test`], 'Proxy was not called');
      });
  });
});
