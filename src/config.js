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

const MisconfigurationError = require('./errors').MisconfigurationError;
const policies = require('./policies');
const runConditional = require('./conditionals').run;

function loadConfig(fileName) {
  let config = readConfigFile(fileName);
  let app = express();
  let rootRouter;
  attachStandardMiddleware(app);
  rootRouter = parseConfig(config);

  app.use((req, res, next) => {
    rootRouter(req, res, next);
  });

  //hot swap router
  fs.watch(fileName, (evt, name) => {
    debug(`watch file triggered ${evt} file ${name}
      note: loading file ${fileName}`);
    let config = readConfigFile(fileName);
    rootRouter = parseConfig(config);
  });

  let server = undefined;
  if (config.tls) {
    server = createTlsServer(config.tls, app);
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

function parseConfig(config) {
  let app = express.Router()
  let pipelineRoutes = parsePipelines(config)

  let publicEndpoints = parsePublicEndpoints(config)
  for (let host of Object.keys(publicEndpoints)) {
    let publicEndpoint = publicEndpoints[host]
    debug(`creating vhost for ${host}`);
    let vhostRouter = express.Router()
    for (let route of publicEndpoint.routes) {
      debug(`registering vhost route ${host} ${route.path} pipeline: ${route.pipeline}`);
      let pipeline = pipelineRoutes[route.pipeline]
      if (!pipeline) {
        throw new MisconfigurationError(`Failed to find pipeline ${route.pipeline} for ${host} ${route.path}`)
      }
      vhostRouter.use(route.path, pipeline)
    }
    app.use(vhost(host, vhostRouter));
  }
  return app;
}

function parsePipelines(config) {
  let pipelineRoutes = {};
  for (let pipelineId in config.pipelines) {
    let pipeline = config.pipelines[pipelineId];
    debug(`processing pipeline ${pipeline.title || pipelineId}`);
    let router = loadPolicies(pipeline.policies || [], config);
    if (pipelineRoutes[pipelineId]) {
      throw new MisconfigurationError("Duplicate pipeline id " + pipelineId);
    }
    pipelineRoutes[pipelineId] = router;
  }
  return pipelineRoutes;
}

function parsePublicEndpoints(config) {
  let publicEndpoints = config.publicEndpoints;
  let endpointsConfig = {};
  for (let endpointName in publicEndpoints) {
    let pe = publicEndpoints[endpointName];
    endpointsConfig[pe.host] = endpointsConfig[pe.host] || { routes: [] }
    endpointsConfig[pe.host].routes.push({
      name: endpointName,
      path: pe.path || '/',
      pipeline: pe.pipeline
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
  for (const policySpec of spec) {
    // TODO: compile all nested s-expressions in advance. This will allow
    // for better validation of the condition spec
    const condition = policySpec.condition || {};
    condition.name = condition.name || 'always'
    const predicate = (req => runConditional(req, condition));
    const actionCtr = policies.resolve(policySpec.action.name);
    if (!actionCtr) {
      throw new MisconfigurationError(
        `Could not find action "${policySpec.action.name}"`);
    }
    const action = actionCtr(policySpec.action, config);

    router.use((req, res, next) => {
      debug(`checking predicate for ${policySpec.action}`);
      if (predicate(req)) {
        debug(`request matched predicate for ${policySpec.action}`);
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