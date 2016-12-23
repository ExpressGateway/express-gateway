'use strict';

const httpProxy = require('http-proxy');
const lodash = require('lodash');
const debug = require('debug')('gateway:proxy');

const MisconfigurationError = require('../errors').MisconfigurationError;

function createMiddleware(params, config) {
  let privateEndpoint = lodash.get(config, ['privateEndpoints',
                                            params.privateEndpoint, 'url']);
  if (!privateEndpoint) {
    throw new MisconfigurationError(
      `Private endpoint ${params.privateEndpoint} (referenced in 'proxy' ` +
      'processor configuration) does not exist');
  }

  let proxy = httpProxy.createProxyServer({
    target: privateEndpoint,
    changeOrigin: params.changeOrigin || false
  });
  proxy.on('error', (err, _req, res) => {
    console.warn('Error', err);

    if (!res.headersSent) {
      res.status(502).send('Bad gateway.');
    } else {
      res.end();
    }
  });

  return function proxyHandler(req, res, _next) {
    debug(`proxying to ${privateEndpoint}`);
    proxy.web(req, res);
  };
};

module.exports = {
  proxy: createMiddleware
};
