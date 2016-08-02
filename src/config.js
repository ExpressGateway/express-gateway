'use strict';

const fs = require('fs');
const express = require('express');
const debug = require('debug')('gateway:config');
const morgan = require('morgan');

const runConditional = require('./conditionals').run;
const processors = require('./processors');

let loadConfig = module.exports = function loadConfig(fileName) {
  let config = readJsonFile(fileName);
  if (!config) {
    return [null, null];
  }

  let app = express();
  attachStandardMiddleware(app);

  for (const pipeline of config.pipelines) {
    debug(`processing pipeline ${pipeline.name}`);

    let router = loadProcessors(pipeline.processors || [], config);
    attachToApp(app, router, pipeline.publicEndpoints || {});
  }

  return [app, config];
};

function readJsonFile(fileName) {
  if (fs.existsSync(fileName)) {
    return JSON.parse(fs.readFileSync(fileName));
  } else {
    debug(`could not find config file ${fileName}`);
    return null;
  }
}

function attachStandardMiddleware(app) {
  morgan.token('target', (req, _res) => req.target ? req.target : '-');
  app.use(morgan(
    ':method (:target) :url :status :response-time ms - :res[content-length]'));
}

function loadProcessors(spec, config) {
  let router = express.Router();

  for (const procSpec of spec) {
    // TODO: compile all nested s-expressions in advance. This will allow
    // for better validation of the condition spec.
    const predicate = (req => runConditional(req, procSpec.condition));
    const action = processors(procSpec.action)(procSpec.params, config);
    if (!action) {
      // TODO: use an Exception subclass
      throw Error(`could not find action ${procSpec.action}`);
    }

    router.use((_req, _res, next) => {
      debug(`checking predicate for ${procSpec.action}`);
      if (predicate(req)) {
        debug(`request matched predicate for ${procSpec.action}`);
        action(req, res, next);
      } else {
        next();
      }
    });
  }

  return router;
}

function attachToApp(app, router, publicEndpoints) {
  for (const ep of publicEndpoints) {
    app.use(ep.path, router);
  }
}

if (require.main === module) {
  debug(loadConfig('example/config.json'));
}
