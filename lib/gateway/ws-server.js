let config = require('../config');
const logger = require('../logger').gateway;
const httpProxy = require('http-proxy');

module.exports.bootstrap = function (apps) {
  let wsConfig = config.gatewayConfig.ws;
  // TODO: Hot reload support
  if (wsConfig && wsConfig.target) {
    logger.debug('Starting WS proxy', wsConfig);
    setupProxy(apps.app, wsConfig);
    setupProxy(apps.httpsApp, wsConfig);
  }
};

function setupProxy (wsServer, wsConfig) {
  let proxy = httpProxy.createProxyServer(wsConfig);
  proxy.on('error', (err, _req, res) => {
    logger.error(err);
    // res.writeHead(500, {'Content-Type': 'text/plain'});
    // res.end('Something went wrong.');
  });
  wsServer.on('upgrade', (req, socket, head) => {
    proxy.ws(req, socket, head);
  });
}
