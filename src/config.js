'use strict';

const fs = require('fs');
const express = require('express');
const http = require('http');
const https = require('https');
const debug = require('debug')('gateway:config');
const morgan = require('morgan');
const minimatch = require('minimatch');
const tls = require('tls');

const ConfigurationError = require('./errors').ConfigurationError;
const actions = require('./actions');
const runConditional = require('./conditionals').run;

function loadConfig(fileName) {
  let config = readJsonFile(fileName);
  let app = express();

  attachStandardMiddleware(app);
  parseConfig(app, config);

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

function parseConfig(app, config) {
  for (const pipeline of config.pipelines) {
    debug(`processing pipeline ${pipeline.name}`);

    let router = loadPolicies(pipeline.policies || [], config);
    attachToApp(app, router, pipeline.apiEndpoints || {});
  }
}

function readJsonFile(fileName) {
  if (fs.existsSync(fileName)) {
    try {
      return JSON.parse(fs.readFileSync(fileName));
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

  for (const policySpec of spec) {
    // TODO: compile all nested s-expressions in advance. This will allow
    // for better validation of the condition spec
    const condition = policySpec.condition || ['always'];
    const predicate = (req => runConditional(req, condition));
    const actionCtr = actions(policySpec.action);
    if (!actionCtr) {
      throw new ConfigurationError(
        `Could not find action "${policySpec.action}"`);
    }
    const action = actionCtr(policySpec.params, config);

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

function attachToApp(app, router, apiEndpoints) {
  for (const ep of apiEndpoints) {
    app.use(ep.path, router);
  }
}

module.exports = {
  loadConfig,
  parseConfig,
  ConfigurationError
};