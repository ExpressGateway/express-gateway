const httpProxy = require('http-proxy');

const ConfigurationError = require('../../errors').ConfigurationError;
const logger = require('../../logger').gateway;
const RoundRobin = require('./round-robin');

const strategies = {
  'round-robin': RoundRobin
};

const createStrategy = (strategy, proxy, endpointUrls) => {
  const Strategy = strategies[strategy];
  return new Strategy(proxy, endpointUrls);
};

module.exports = function (params, config, serverInstances) {
  const serviceEndpointKey = params.serviceEndpoint;
  const endpoint = config.gatewayConfig.serviceEndpoints[serviceEndpointKey];

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
    changeOrigin: params.changeOrigin || false
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

  // define the load balancer here so it can be reused between
  // web and ws proxy calls
  let balancer = null;

  if (endpoint.urls) {
    // multiple urls will load balance, defaulting to round-robin
    const strategy = endpoint.strategy || 'round-robin';
    balancer = createStrategy(strategy, proxy, endpoint.urls);
  }

  if (serverInstances) {
    Object.keys(serverInstances).forEach(key => {
      const server = serverInstances[key];

      if (server === null) {
        return;
      }

      server.on('upgrade', (req, socket, head) => {
        // single url, proxy to it
        if (endpoint.url) {
          logger.debug(`proxying to ${endpoint.url}, ${req.method} ${req.url}`);
          return proxy.ws(req, socket, head, { target: endpoint.url });
        }

        // load balance
        balancer.proxyWebSocket(req, socket, head);
      });
    });
  }

  // single `url` property takes precedence over `urls` array
  if (endpoint.url) {
    return function proxyHandler (req, res) {
      logger.debug(`proxying to ${endpoint.url}, ${req.method} ${req.url}`);
      proxy.web(req, res, { target: endpoint.url });
    };
  }

  // return load balanced handler
  return function balancerProxyHandler (req, res) {
    return balancer.proxyWeb(req, res);
  };
};
