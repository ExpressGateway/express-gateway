const httpProxy = require('http-proxy');
const fs = require('fs');
const logger = require('../../logger').gateway;
const strategies = require('./strategies');

const createStrategy = (strategy, proxyOptions, endpointUrls) => {
  const Strategy = strategies[strategy];
  return new Strategy(proxyOptions, endpointUrls);
};

module.exports = function (params, config) {
  const serviceEndpointKey = params.serviceEndpoint;
  const endpoint = config.gatewayConfig.serviceEndpoints[serviceEndpointKey];
  const proxyOptions = parseProxyOptions(params.proxyOptions, endpoint);

  if (!endpoint) {
    throw new Error(
      `service endpoint ${serviceEndpointKey} (referenced in 'proxy' ` +
        'policy configuration) does not exist');
  }

  if (!endpoint.url && !endpoint.urls) {
    throw new Error(
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

  let balancer;
  if (endpoint.url) {
    // single `url` property takes precedence over `urls` array
    balancer = createStrategy('static', proxyOptions, [endpoint.url]);
  } else {
    const strategy = params.strategy || 'round-robin';
    balancer = createStrategy(strategy, proxyOptions, endpoint.urls);
  }
  return function proxyHandler (req, res) {
    const targetUrl = balancer.nextTarget();
    proxyOptions.target = Object.assign(proxyOptions.target, targetUrl);

    logger.debug(`proxying to ${targetUrl}, ${req.method} ${req.url}`);
    proxy.web(req, res, proxyOptions);
  };

  // multiple urls will load balance, defaulting to round-robin
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

  return parsedProxyOptions;
}
