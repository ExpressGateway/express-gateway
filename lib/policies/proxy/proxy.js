'use strict';

const httpProxy = require('http-proxy');
const lodash = require('lodash');
const logger = require('../../logger').gateway;

const ConfigurationError = require('../../errors').ConfigurationError;

module.exports = function (params, config) {
  let serviceEndpoint = lodash.get(config.gatewayConfig, ['serviceEndpoints',
    params.serviceEndpoint, 'url'
  ]);
  if (!serviceEndpoint) {
    throw new ConfigurationError(
      `Service endpoint ${params.serviceEndpoint} (referenced in 'proxy' ` +
      'policy configuration) does not exist');
  }

  let proxy = httpProxy.createProxyServer({
    target: serviceEndpoint,
    changeOrigin: params.changeOrigin || false
  });
  proxy.on('error', (err, _req, res) => {
    logger.warn(err);

    if (!res.headersSent) {
      res.status(502).send('Bad gateway.');
    } else {
      res.end();
    }
  });

  return function proxyHandler (req, res, _next) {
    logger.debug(`proxying to ${serviceEndpoint}`);
    proxy.web(req, res);
  };
};
