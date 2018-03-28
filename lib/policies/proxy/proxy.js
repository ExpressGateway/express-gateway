const httpProxy = require('http-proxy');
const fs = require('fs');
const ProxyAgent = require('proxy-agent');
const logger = require('../../logger').policy;
const strategies = require('./strategies');

const createStrategy = (strategy, proxyOptions, endpointUrls) => {
  const Strategy = strategies[strategy];
  return new Strategy(proxyOptions, endpointUrls);
};

module.exports = function (params, config) {
  const serviceEndpointKey = params.serviceEndpoint;
  const endpoint = config.gatewayConfig.serviceEndpoints[serviceEndpointKey];

  if (!endpoint) { // Note: one day this can be ensured by JSON Schema, when $data keyword will be avaiable.
    throw new Error(`service endpoint ${serviceEndpointKey} (referenced in proxy policy configuration) does not exist`);
  }

  const proxyOptions = parseProxyOptions(params.proxyOptions);
  const intermediateProxyUrl = process.env.http_proxy || process.env.HTTP_PROXY || params.proxyUrl;

  if (intermediateProxyUrl) {
    logger.info(`using intermediate proxy ${intermediateProxyUrl}`);
    proxyOptions.agent = new ProxyAgent(intermediateProxyUrl);
  }

  const proxy = httpProxy.createProxyServer(Object.assign({ changeOrigin: params.changeOrigin }, proxyOptions));

  proxy.on('error', (err, req, res) => {
    logger.warn(err);

    if (!res.headersSent) {
      res.status(502).send('Bad gateway.');
    } else {
      res.end();
    }
  });

  let strategy;
  let urls;

  if (endpoint.url) {
    strategy = 'static';
    urls = [endpoint.url];
  } else {
    strategy = params.strategy || 'round-robin';
    urls = endpoint.urls;
  }

  const balancer = createStrategy(strategy, proxyOptions, urls);

  return function proxyHandler (req, res) {
    const target = balancer.nextTarget();
    const headers = Object.assign(getDefaultHeaders(req.egContext), proxyOptions.headers);

    logger.debug(`proxying to ${target.href}, ${req.method} ${req.url}`);

    proxy.web(req, res, { target, headers });
  };

  // multiple urls will load balance, defaulting to round-robin
};

function getDefaultHeaders (egContext) {
  const headers = {};
  // Default headers always sent to downstream
  // TODO: allow configuration
  if (egContext.requestId) {
    headers['eg-request-id'] = egContext.requestId;
  }
  headers['eg-consumer-id'] = egContext.consumer && egContext.consumer.id
    ? egContext.consumer.id : 'anonymous';

  return headers;
}

// Parse endpoint URL if single URL is provided.
// Extend proxy options by allowing and parsing keyFile, certFile and caFile.
function parseProxyOptions (proxyOptions = {}) {
  const parsedProxyOptions = Object.assign({}, proxyOptions);

  if (parsedProxyOptions.target) {
    if (parsedProxyOptions.target.keyFile) {
      parsedProxyOptions.target.key = fs.readFileSync(parsedProxyOptions.target.keyFile);
      delete parsedProxyOptions.target.keyFile;
    }

    if (parsedProxyOptions.target.certFile) {
      parsedProxyOptions.target.cert = fs.readFileSync(parsedProxyOptions.target.certFile);
      delete parsedProxyOptions.target.certFile;
    }

    if (parsedProxyOptions.target.caFile) {
      parsedProxyOptions.target.ca = fs.readFileSync(parsedProxyOptions.target.caFile);
      delete parsedProxyOptions.target.caFile;
    }
  } else {
    parsedProxyOptions.target = {};
  }

  return parsedProxyOptions;
}
