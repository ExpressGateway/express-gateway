const logger = require('../log').config;
const actions = require('../actions').init();
const conditions = require('../conditions');
const express = require('express');
const vhost = require('vhost')
const mm = require('micromatch')
const ConfigurationError = require('../errors').ConfigurationError;

module.exports.bootstrap = function(app, config) {
  validateConfig(config);
  let apiEndpointToPipelineMap = {}
  for (const [pipelineName, pipeline] of Object.entries(config.pipelines)) {
    logger.debug(`processing pipeline ${pipelineName}`)
    let router = configurePipeline(pipeline.policies || [], config)
    for (let apiName of pipeline.apiEndpoints) {
      apiEndpointToPipelineMap[apiName] = router
    }
  }

  let apiEndpoints = processApiEndpoints(config.apiEndpoints);
  for (let [host, hostConfig] of Object.entries(apiEndpoints)) {
    let router = express.Router()
    router.use((req, res, next) => {
      logger.debug("processing vhost %s %j", host, hostConfig.routes)
      for (let route of hostConfig.routes) {
        if (route.verbs && !mm.any(req.method, route.verbs)) {
          logger.debug("verb is not matched for apiEndpointName %s verbs %j method:", route.apiEndpointName, route.verbs, req.method);
          continue
        }

        if (route.pathRegex) {
          if (req.url.match(RegExp(route.pathRegex))) {
            logger.debug("regex path matched for apiEndpointName %s", route.apiEndpointName)
            return apiEndpointToPipelineMap[route.apiEndpointName](req, res, next);
          }
          continue;
        }

        let path = route.path || '**' // defaults to serve all requests
        if (mm.isMatch(req.url, path)) {
          logger.debug("path matched for apiEndpointName %s", route.apiEndpointName)
          return apiEndpointToPipelineMap[route.apiEndpointName](req, res, next);
        }
      }
      return next()
    })
    if (!host || host === '*' || host === '**') {
      app.use(router);
    } else {
      let virtualHost = hostConfig.isRegex ? new RegExp(host) : host
      app.use(vhost(virtualHost, router));
    }
  }
  return app;
}

function processApiEndpoints(apiEndpoints) {
  let cfg = {}
  logger.debug('loading apiEndpoints %j', apiEndpoints)
  for (let [apiEndpointName, endpointConfig] of Object.entries(apiEndpoints)) {
    let host = endpointConfig.hostRegex
    let isRegex = true;
    if (!host) {
      host = endpointConfig.host || '*'
      isRegex = false
    }

    cfg[host] = cfg[host] || { isRegex, routes: [] };
    logger.debug('processing host: %s, isRegex: %s', host, cfg[host].isRegex)
    let route = Object.assign({}, endpointConfig, { apiEndpointName })
    logger.debug('adding route to host: %s, %j', host, route)
    cfg[host].routes.push(route)
  }
  return cfg
}

function configurePipeline(spec, config) {
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

function validateConfig(config) {
  if (!config) {
    throw new ConfigurationError("No config provided")
  }
  if (!config.pipelines) {
    throw new ConfigurationError("No pipelines found")
  }
  if (!config.apiEndpoints) {
    throw new ConfigurationError("No apiEndpoints found")
  }
}