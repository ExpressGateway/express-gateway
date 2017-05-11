'use strict';

const fs = require('fs');
const express = require('express');
const http = require('http');
const https = require('https');
const logger = require('./log').config;
const morgan = require('morgan');
const minimatch = require('minimatch');
const path = require('path')
const tls = require('tls');
const vhost = require('vhost');
const yaml = require('js-yaml');

const ConfigurationError = require('./errors').ConfigurationError;
const policies = require('./policies');
const conditionals = require('./conditionals');

async function loadConfig(fileName) {
  let config = readConfigFile(fileName);
  let app = express();
  let rootRouter;
  attachStandardMiddleware(app);
  rootRouter = await parseConfig(config);

  app.use((req, res, next) => {
    rootRouter(req, res, next);
  });

  let server = undefined;
  if (config.https && config.https.tls) {
    server = createTlsServer(config.https.tls, app);
  } else {
    server = http.createServer(app);
  }

  return [server, config];
}

function createTlsServer(tlsConfig, app) {
  let defaultCert = null;
  let sniCerts = [];

  for (let [domain, certPaths] of Object.entries(tlsConfig)) {
    let cert;
    if (domain === 'default') {
      cert = defaultCert = {};
    } else {
      cert = {};
      sniCerts.push([domain, cert]);
    }

    cert.key = fs.readFileSync(certPaths.key, 'utf-8');
    cert.cert = fs.readFileSync(certPaths.cert, 'utf-8');
  }

  let options = {};

  if (defaultCert) {
    options.key = defaultCert.key;
    options.cert = defaultCert.cert;
  }

  if (sniCerts.length > 0) {
    options.SNICallback = (servername, cb) => {
      for (let [domain, cert] of sniCerts) {
        if (minimatch(servername, domain)) {
          logger.debug(`sni: using cert for ${domain}`);
          cb(null, tls.createSecureContext(cert));
          return;
        }
      }
      if (defaultCert) {
        logger.debug('sni: using default cert');
        cb(null, tls.createSecureContext(defaultCert));
      } else {
        logger.warn('sni: no cert!');
        cb(new Error('cannot start TLS - no cert configured'));
      }
    };
  }

  return https.createServer(options, app);
}


async function parseConfig(config) {
  let app = express.Router()


  let pipelines = parsePipelines(config)
  app.use((req, res, next) => {
    logger.debug("processing app %s", req.hostname)
    return next();
  })
  let apiEndpoints = parseApiEndpoints(config)

  for (let host of Object.keys(apiEndpoints)) {
    let publicEndpoint = apiEndpoints[host]
    logger.debug(`creating vhost for ${host}`);
    let router = express.Router()
    for (let route of publicEndpoint.routes) {
      logger.debug(`registering pipeline router for host:${host} path:${route.path} api name: ${route.name}`);
      let pipelineRouter = pipelines[route.name]
      if (!pipelineRouter) {
        //throw new ConfigurationError(`Failed to find pipeline for ${route.name} host: ${host} path: ${route.path}`)
        logger.warn(`WARNING: Failed to find pipeline for ${route.name} host: ${host} path: ${route.path}, `)
        continue;
      }
      router.use((req, res, next) => {
        logger.debug("processing vhost %s", host)
        return next();
      })
      let vpath = route.path || '/';
      if (route.pathRegex) {
        vpath = new RegExp(route.pathRegex);
      }
      router.use(vpath, pipelineRouter)
    }
    let virtualHost = publicEndpoint.isRegex ? new RegExp(host) : host
    if (!virtualHost || virtualHost == '*') {
      app.use(router);
    } else {
      app.use(vhost(virtualHost, router));
    }
  }
  return app;
}

function parsePipelines(config) {
  let apiPipelines = {};
  for (let pipelineId in config.pipelines) {
    let pipeline = config.pipelines[pipelineId];
    logger.debug(`processing pipeline ${pipeline.title || pipelineId}`);
    let router = loadPolicies(pipeline.policies || [], config);
    // pipeline with all its policies is a router instance
    // returning a map of APIEndpoint name : router
    // it can be the same router (pipeline) processing different apiEndpoints
    for (let endpoint of pipeline.apiEndpoints) {
      apiPipelines[endpoint] = router;
    }
  }
  return apiPipelines;
}

function parseApiEndpoints(config) {
  let apiEndpoints = config.apiEndpoints;
  let endpointsConfig = {};
  for (let endpointName in apiEndpoints) {
    let pe = apiEndpoints[endpointName];
    let host = pe.host;
    let isRegex = false;
    if (!host) {
      host = pe.hostRegex;
      isRegex = true
    }
    if (!host) {
      throw new ConfigurationError('Public domain must have host or hostRegex defined');
    }
    endpointsConfig[host] = endpointsConfig[host] || {
      routes: [],
      isRegex
    }
    endpointsConfig[host].routes.push({
      name: endpointName,
      path: pe.path,
      pathRegex: pe.pathRegex,
    })
  }
  return endpointsConfig;
}

function readConfigFile(fileName) {
  if (fs.existsSync(fileName)) {
    try {
      let fileContent = fs.readFileSync(fileName);
      if (path.extname(fileName) === '.json') {
        return JSON.parse(fileContent);
      } else { // defaults to yaml
        return yaml.load(fileContent);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new ConfigurationError(`Bad config file format: ${err}`);
      } else if ('errno' in err) {
        throw new ConfigurationError(`Could not read config file: ${err}`);
      }
      throw err;
    }
  } else {
    throw new ConfigurationError(`Could not find config file ${fileName}`);
  }
}

function attachStandardMiddleware(app) {
  morgan.token('target', (req, _res) => req.target ? req.target : '-');
  app.use(morgan(
    ':method (:target) :url :status :response-time ms - :res[content-length]'));
}

function loadPolicies(spec, config) {
  let router = express.Router();
  router.use((req, res, next) => {
    logger.debug("processing pipeline %j %j", spec, config)
    return next();
  })
  for (const policySpec of spec) {
    const condition = policySpec.condition || {};
    condition.name = condition.name || 'always'
    const predicate = (req => conditionals.run(req, condition));

    const actionCtr = policies.resolve(policySpec.action.name);
    if (!actionCtr) {
      throw new ConfigurationError(
        `Could not find action "${policySpec.action.name}"`);
    }
    const action = actionCtr(policySpec.action, config);
    router.use((req, res, next) => {
      logger.debug(`checking predicate for ${policySpec.action.name}`);
      if (predicate(req)) {
        logger.debug(`request matched predicate for ${policySpec.action.name}`);
        action(req, res, next);
      } else {
        next();
      }
    });
  }

  return router;
}

module.exports = {
  loadConfig,
  parseConfig,
  readConfigFile,
  ConfigurationError
};