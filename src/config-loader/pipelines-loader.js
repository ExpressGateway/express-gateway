const logger = require('../log').config;
const actions = require('../actions').init();
const conditions = require('../conditions');
const express = require('express');
const ConfigurationError = require('../errors').ConfigurationError;

module.exports.bootstrap = function(app, config) {
  if (!config.pipelines) {
    throw new ConfigurationError("No pipelines found")
  }
  for (const [pipelineName, pipeline] of Object.entries(config.pipelines)) {
    logger.debug(`processing pipeline ${pipelineName}`);

    let router = loadPolicies(pipeline.policies || [], config);
    for (let apiName of pipeline.apiEndpoints) {
      let ep = config.apiEndpoints[apiName];
      app.use(ep.path, router);
    }
  }
  return app;
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
      logger.debug(`checking predicate for %j`, policySpec.action);
      if (req.matchEGCondition(condition)) {
        logger.debug('request matched predicate for %j', policySpec.action);
        action(req, res, next);
      } else {
        next();
      }
    });
  }

  return router;
}