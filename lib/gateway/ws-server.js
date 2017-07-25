// let config = require('../config');
const logger = require('../logger').gateway;
const httpProxy = require('http-proxy');

module.exports.bootstrap = function (apps) {
  let wsServer = apps.app;
  let proxy = httpProxy.createProxyServer({
    target: 'ws://localhost:10017'
    // changeOrigin: params.changeOrigin || false
  });
  proxy.on('error', (err, _req, res) => {
    logger.error(err);
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end('Something went wrong.');
  });
  wsServer.on('upgrade', (req, socket, head) => {
    proxy.ws(req, socket, head);
  });
};
