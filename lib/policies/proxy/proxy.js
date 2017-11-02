const httpProxy = require('http-proxy');
const fs = require('fs');
const url = require('url');

const ConfigurationError = require('../../errors').ConfigurationError;
const logger = require('../../logger').gateway;
const RoundRobin = require('./round-robin');

const strategies = {
  'round-robin': RoundRobin
};

const createStrategy = (strategy, proxy, proxyOptions, endpointUrls) => {
  const Strategy = strategies[strategy];
  return new Strategy(proxy, proxyOptions, endpointUrls);
};

module.exports = function (params, config) {
  const serviceEndpointKey = params.serviceEndpoint;
  const endpoint = config.gatewayConfig.serviceEndpoints[serviceEndpointKey];
  const proxyOptions = parseProxyOptions(params.proxyOptions, endpoint);

  if (!endpoint) {
    throw new ConfigurationError(
      `service endpoint ${serviceEndpointKey} (referenced in 'proxy' ` +
        'policy configuration) does not exist');
  }

  if (!endpoint.url && !endpoint.urls) {
    throw new ConfigurationError(
      `service endpoint ${serviceEndpointKey} (referenced in 'proxy' ` +
        'policy configuration) does not contain a `url` or `urls` property');
  }

  const proxy = httpProxy.createProxyServer({
    changeOrigin: params.changeOrigin !== false
  });

  proxy.on('error', (err, _req, res) => {
    logger.warn(err);

    if (!res) {
      throw err;
    }

    if (!res.headersSent) {
      res.status(502).send('Bad gateway.');
    } else {
      res.end();
    }
  });

  // single `url` property takes precedence over `urls` array
  if (endpoint.url) {
    return function proxyHandler (req, res) {
      logger.debug(`proxying to ${endpoint.url}, ${req.method} ${req.url}`);
      proxy.web(req, res, proxyOptions);
    };
  }

  // multiple urls will load balance, defaulting to round-robin
  const strategy = params.strategy || 'round-robin';
  const balancer = createStrategy(strategy, proxy, proxyOptions, endpoint.urls);

  return function balancerProxyHandler (req, res) {
    return balancer.proxy(req, res);
  };
};

// Parse endpoint URL if single URL is provided.
// Extend proxy options by allowing and parsing keyFile, certFile and caFile.
function parseProxyOptions (proxyOptions = {}, endpoint = {}) {
  let parsedProxyOptions = {};

  if (endpoint.proxyOptions) {
    parsedProxyOptions = Object.assign(parsedProxyOptions, endpoint.proxyOptions);
  }

  parsedProxyOptions = Object.assign(parsedProxyOptions, proxyOptions);

  if (parsedProxyOptions.target) {
    if (parsedProxyOptions.target.keyFile) {
      parsedProxyOptions.target.key = fs.readFileSync(parsedProxyOptions.target.keyFile);
    }

    if (parsedProxyOptions.target.certFile) {
      parsedProxyOptions.target.cert = fs.readFileSync(parsedProxyOptions.target.certFile);
    }

    if (parsedProxyOptions.target.caFile) {
      parsedProxyOptions.target.ca = fs.readFileSync(parsedProxyOptions.target.caFile);
    }
  } else {
    parsedProxyOptions.target = {};
  }

  if (endpoint.url) {
    const parsedEndpointUrl = endpoint.url ? url.parse(endpoint.url) : {};
    parsedProxyOptions.target = Object.assign(parsedProxyOptions.target, parsedEndpointUrl);
  }

  return parsedProxyOptions;
}
