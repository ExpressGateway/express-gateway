'use strict';

const fs = require('fs');
const express = require('express');

const debug = require('debug')('gateway:config');
const morgan = require('morgan');

const ConfigurationError = require('../errors').ConfigurationError;
const actions = require('../actions');
const runcondition = require('../conditions').run;
const server = require('./server-loader');

function loadConfig(fileName) {
  let config = readJsonFile(fileName);
  let app = express();

  attachStandardMiddleware(app);
  parseConfig(app, config);


  let servers = server.bootstrap(app, config)

  //TODO: as part of #13 refactor to return both server and run at the same time
  return [servers.httpsServer || servers.httpServer, config];
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
    const predicate = (req => runcondition(req, condition));
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