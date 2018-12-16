const fs = require('fs');
const clone = require('clone');
const httpProxy = require('http-proxy');
const ProxyAgent = require('proxy-agent');
const logger = require('../../logger').policy;
const strategies = require('./strategies');

const createStrategy = (strategy, proxyOptions, endpointUrls) => {
  const Strategy = strategies[strategy];
  return new Strategy(proxyOptions, endpointUrls);
};

module.exports = function (params, config) {
  const serviceEndpointKey = params.serviceEndpoint;

  if (!serviceEndpointKey) {
    logger.warn('Service Endpoint not provided — this proxy policy will permanently return 502');
    return (req, res) => res.sendStatus(502);
  }

  const endpoint = config.gatewayConfig.serviceEndpoints[serviceEndpointKey];

  if (!endpoint) { // Note: one day this can be ensured by JSON Schema, when $data keyword will be avaiable.
    throw new Error(`service endpoint ${serviceEndpointKey} (referenced in proxy policy configuration) does not exist`);
  }

  const proxyOptions = Object.assign({}, clone(params));

  if (endpoint.proxyOptions) {
    Object.assign(proxyOptions, clone(endpoint.proxyOptions));
  } if (params.proxyOptions) {
    logger.warn(`The proxyOption object is deprecated and will be likely removed in the next major version. Consider
    putting these properties directly on the action parameters instead.`);
    Object.assign(proxyOptions, clone(params.proxyOptions));
  }

  if (proxyOptions.target) {
    const certLocations = {
      keyFile: proxyOptions.target.keyFile,
      certFile: proxyOptions.target.certFile,
      caFile: proxyOptions.target.caFile
    };

    delete proxyOptions.target.keyFile;
    delete proxyOptions.target.certFile;
    delete proxyOptions.target.caFile;

    const certificatesBuffer = readCertificateDataFromFile(certLocations);
    Object.assign(proxyOptions.target, certificatesBuffer);
  }

  const intermediateProxyUrl = process.env.http_proxy || process.env.HTTP_PROXY || params.proxyUrl;

  if (intermediateProxyUrl) {
    logger.verbose(`using intermediate proxy ${intermediateProxyUrl}`);
    proxyOptions.agent = new ProxyAgent(intermediateProxyUrl);
  }

  const proxy = httpProxy.createProxyServer(Object.assign(params, proxyOptions));

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

  const stripPathFn = params.stripPath
    ? req => {
      req.url = `${req.params[0] || ''}${req._parsedUrl.search || ''}`;
    } : () => { };

  return function proxyHandler (req, res) {
    const target = balancer.nextTarget();
    const headers = Object.assign({ 'eg-request-id': req.egContext.requestID }, proxyOptions.headers);

    stripPathFn(req);

    logger.debug(`proxying to ${target.href}, ${req.method} ${req.url}`);
    proxy.web(req, res, { target, headers, buffer: req.egContext.requestStream });
  };

  // multiple urls will load balance, defaulting to round-robin
};

// Parse endpoint URL if single URL is provided.
// Extend proxy options by allowing and parsing keyFile, certFile and caFile.
function readCertificateDataFromFile ({ keyFile, certFile, caFile }) {
  let key, cert, ca;

  if (keyFile) {
    key = fs.readFileSync(keyFile);
  }

  if (certFile) {
    cert = fs.readFileSync(certFile);
  }

  if (caFile) {
    ca = fs.readFileSync(caFile);
  }

  return { key, cert, ca };
}
