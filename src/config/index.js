'use strict';

const fs = require('fs');
const express = require('express');
const http = require('http');
const https = require('https');
const debug = require('debug')('EG:config');
const morgan = require('morgan');
const minimatch = require('minimatch');
const path = require('path')
const tls = require('tls');
const vhost = require('vhost');
const yaml = require('js-yaml');
const pluginLoader = require('./plugin-loader');

const MisconfigurationError = require('../errors').MisconfigurationError;
const policies = require('../policies');
const conditionals = require('../conditionals');

async function loadConfig(fileName) {
  let config = readConfigFile(fileName);
  let app = express();
  let rootRouter;
  attachStandardMiddleware(app);
  rootRouter = await parseConfig(config);

  app.use((req, res, next) => {
    rootRouter(req, res, next);
  });

  //hot swap router
  fs.watch(fileName, async(evt, name) => {
    debug(`watch file triggered ${evt} file ${name}
      note: loading file ${fileName}`);
    let config = readConfigFile(fileName);
    rootRouter = await parseConfig(config);
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
          debug(`sni: using cert for ${domain}`);
          cb(null, tls.createSecureContext(cert));
          return;
        }
      }
      if (defaultCert) {
        debug('sni: using default cert');
        cb(null, tls.createSecureContext(defaultCert));
      } else {
        debug('sni: no cert!');
        cb(new Error('cannot start TLS - no cert configured'));
      }
    };
  }

  return https.createServer(options, app);
}


async function parseConfig(config) {
  let app = express.Router()

  // No error handling, fail if misconfigured
  await pluginLoader.loadPlugins(app, config)

  let apiPipelines = parsePipelines(config)
  app.use((req, res, next) => {
    debug("processing app %s", req.hostname)
    return next();
  })
  let APIEndpoints = parseAPIEndpoints(config)

  for (let host of Object.keys(APIEndpoints)) {
    let publicEndpoint = APIEndpoints[host]
    debug(`creating vhost for ${host}`);
    let router = express.Router()
    for (let route of publicEndpoint.routes) {
      debug(`registering pipeline router for host:${host} path:${route.path} api name: ${route.name}`);
      let pipelineRouter = apiPipelines[route.name]
      if (!pipelineRouter) {
        //throw new MisconfigurationError(`Failed to find pipeline for ${route.name} host: ${host} path: ${route.path}`)
        debug(`WARNING: Failed to find pipeline for ${route.name} host: ${host} path: ${route.path}, `)
        continue;
      }
      router.use((req, res, next) => {
        debug("processing vhost %s", host)
        return next();
      })
      let vpath = route.path || '/';
      if (route.path_regex) {
        vpath = new RegExp(route.path_regex);
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
    debug(`processing pipeline ${pipeline.title || pipelineId}`);
    let router = loadPolicies(pipeline.policies || [], config);
    // pipeline with all its policies is a router instance
    // returning a map of APIEndpoint name : router
    // it can be the same router (pipeline) processing different APIEndpoints
    for (let endpoint of pipeline.APIEndpoints) {
      apiPipelines[endpoint] = router;
    }
  }
  return apiPipelines;
}

function parseAPIEndpoints(config) {
  let APIEndpoints = config.APIEndpoints;
  let endpointsConfig = {};
  for (let endpointName in APIEndpoints) {
    let pe = APIEndpoints[endpointName];
    let host = pe.host;
    let isRegex = false;
    if (!host) {
      host = pe.host_regex;
      isRegex = true
    }
    if (!host) {
      throw new MisconfigurationError('Public domain must have host or host_regex defined');
    }
    endpointsConfig[host] = endpointsConfig[host] || {
      routes: [],
      isRegex
    }
    endpointsConfig[host].routes.push({
      name: endpointName,
      path: pe.path,
      path_regex: pe.path_regex,
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
        throw new MisconfigurationError(`Bad config file format: ${err}`);
      } else if ('errno' in err) {
        throw new MisconfigurationError(`Could not read config file: ${err}`);
      }
      throw err;
    }
  } else {
    throw new MisconfigurationError(`Could not find config file ${fileName}`);
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
    debug("processing pipeline %o %o", spec, config)
    return next();
  })
  for (const policySpec of spec) {
    // TODO: compile all nested s-expressions in advance. This will allow
    // for better validation of the condition spec
    const condition = policySpec.condition || {};
    condition.name = condition.name || 'always'
    const predicate = (req => conditionals.run(req, condition));

    const actionCtr = policies.resolve(policySpec.action.name);
    if (!actionCtr) {
      throw new MisconfigurationError(
        `Could not find action "${policySpec.action.name}"`);
    }
    const action = actionCtr(policySpec.action, config);
    router.use((req, res, next) => {
      debug(`checking predicate for ${policySpec.action.name}`);
      if (predicate(req)) {
        debug(`request matched predicate for ${policySpec.action.name}`);
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
  MisconfigurationError
};