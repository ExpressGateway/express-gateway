const debug = require('debug')('gateway:config');
const actions = require('../actions');
const runcondition = require('../conditions').run;
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