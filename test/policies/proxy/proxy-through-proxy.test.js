const gwHelper = require('../../common/gateway.helper');
const cliHelper = require('../../common/cli.helper');
const httpProxy = require('http-proxy');
const http = require('http');
const assert = require('assert');
const request = require('superagent');

describe('@proxy through proxy', () => {
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
  before('init', (done) => {
    cliHelper.bootstrapFolder().then(dirInfo => {
      const proxy = httpProxy.createProxyServer({
        changeOrigin: true
      });

      const srv = http.createServer(function (req, res) {
        proxiedUrls[req.url] = true;
        proxy.web(req, res, { target: req.url });
      });

      const server = srv.listen(0, () => {
        process.env.http_proxy = 'http://localhost:' + server.address().port;
        gwHelper.startGatewayInstance({ dirInfo, gatewayConfig }).then(({gatewayProcess}) => {
          gw = gatewayProcess;
          done();
        });
      });
    });
  });
  after('cleanup', () => {
    delete process.env.http_proxy;
    gw.kill();
  });
  it('send through proxy', () => {
    return request
      .get(`http://localhost:${gatewayConfig.http.port}/test`)
      .then((res) => {
        assert.ok(res.text);
        // we need to ensure that request went through proxy, not directly
        assert.ok(proxiedUrls[`${gatewayConfig.serviceEndpoints.backend.url}/test`], 'Proxy was not called');
      });
  });
});
