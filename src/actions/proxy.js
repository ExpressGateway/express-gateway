'use strict';

const httpProxy = require('http-proxy');
const lodash = require('lodash');
const debug = require('debug')('gateway:proxy');

const ConfigurationError = require('../errors').ConfigurationError;

function createMiddleware(params, config) {
  let serviceEndpoint = lodash.get(config, ['serviceEndpoints',
    params.serviceEndpoint, 'url'
  ]);
  if (!serviceEndpoint) {
    throw new ConfigurationError(
      `Private endpoint ${params.serviceEndpoint} (referenced in 'proxy' ` +
      'processor configuration) does not exist');
  }

  let proxy = httpProxy.createProxyServer({
    target: serviceEndpoint,
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
    debug(`proxying to ${serviceEndpoint}`);
    proxy.web(req, res);
  };
}

module.exports = {
  proxy: createMiddleware
};