const debug = require('debug')('gateway:config');
const actions = require('../actions').init();
const conditions = require('../conditions');
const express = require('express');
const ConfigurationError = require('../errors').ConfigurationError;

module.exports.bootstrap = function(app, config) {
  for (const pipeline of config.pipelines) {
    debug(`processing pipeline ${pipeline.name}`);

    let router = loadPolicies(pipeline.policies || [], config);
    attachToApp(app, router, pipeline.apiEndpoints || {});
  }
}

function loadPolicies(spec, config) {
  let router = express.Router();
  conditions.init()
  for (const policySpec of spec) {
    const condition = policySpec.condition || { name: 'always' };
    const actionCtr = actions.resolve(policySpec.action.name);
    if (!actionCtr) {
      throw new ConfigurationError(
        `Could not find action "${policySpec.action.name}"`);
    }
    const action = actionCtr(policySpec.action, config);

    router.use((req, res, next) => {
      debug(`checking predicate for %j`, policySpec.action);
      if (req.matchEGCondition(condition)) {
        debug('request matched predicate for %j', policySpec.action);
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