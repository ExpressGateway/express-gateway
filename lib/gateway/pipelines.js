const logger = require('../log').config;
const actions = require('../actions').init();
const conditions = require('../conditions');
const {EgContextBase} = require('./context');
const express = require('express');
const vhost = require('vhost');
const ConfigurationError = require('../errors').ConfigurationError;
let config = require('../config');

module.exports.bootstrap = function (app) {
  validateConfig(config.gatewayConfig);
  let apiEndpointToPipelineMap = {};
  for (let el in config.gatewayConfig.pipelines) {
    let pipelineName = el;
    let pipeline = config.gatewayConfig.pipelines[el];

    logger.debug(`processing pipeline ${pipelineName}`);
    let router = configurePipeline(pipeline.policies || []);
    for (let apiName of pipeline.apiEndpoints) {
      apiEndpointToPipelineMap[apiName] = router;
    }
  }

  let apiEndpoints = processApiEndpoints(config.gatewayConfig.apiEndpoints);
  for (let el in apiEndpoints) {
    let host = el;
    let hostConfig = apiEndpoints[el];
    let router = express.Router();
    logger.debug('processing vhost %s %j', host, hostConfig.routes);
    for (let route of hostConfig.routes) {
      let mountPaths = [];
      if (route.pathRegex) {
        mountPaths.push(RegExp(route.pathRegex));
      } else if (route.paths && route.paths.length) {
        mountPaths = mountPaths.concat(route.paths);
      } else {
        mountPaths.push('*');
      }
      for (let path of mountPaths) {
        logger.debug('mounting routes for apiEndpointName %s, mount %s', route.apiEndpointName, path);
        let handler = (req, res, next) => {
          logger.debug('executing pipeline for api %s, mounted at %s', route.apiEndpointName, path);

          req.egContext = Object.create(new EgContextBase());
          req.egContext.req = req;
          req.egContext.res = res;
          req.egContext.apiEndpoint = route;
          return apiEndpointToPipelineMap[route.apiEndpointName](req, res, next);
        };
        if (route.methods && route.methods !== '*') {
          logger.debug('methods specified, registering for each method individually');
          let methods = Array.isArray(route.methods) ? route.methods : route.methods.split(',');
          for (let method of methods) {
            let m = method.trim().toLowerCase();
            if (m) {
              router[m](path, handler);
            }
          }
        } else {
          logger.debug('no methods specified. handle all mode.');
          router.all(path, handler);
        }
      }
    }
    if (!host || host === '*') {
      app.use(router);
    } else {
      let virtualHost = hostConfig.isRegex ? new RegExp(host) : host;
      app.use(vhost(virtualHost, router));
    }
  }
  return app;
};

function processApiEndpoints (apiEndpoints) {
  let cfg = {};
  logger.debug('loading apiEndpoints %j', apiEndpoints);
  for (let el in apiEndpoints) {
    let apiEndpointName = el;
    let endpointConfigs = apiEndpoints[el];
    // apiEndpoint can be array or object {host, paths, methods, ...}
    endpointConfigs = Array.isArray(endpointConfigs) ? endpointConfigs : [endpointConfigs];

    endpointConfigs.forEach(endpointConfig => {
      let host = endpointConfig.hostRegex;
      let isRegex = true;
      if (!host) {
        host = endpointConfig.host || '*';
        isRegex = false;
      }

      cfg[host] = cfg[host] || { isRegex, routes: [] };
      logger.debug('processing host: %s, isRegex: %s', host, cfg[host].isRegex);
      let route = Object.assign({ apiEndpointName }, endpointConfig);
      logger.debug('adding route to host: %s, %j', host, route);
      cfg[host].routes.push(route);
    });
  }
  return cfg;
}

function configurePipeline (policies) {
  let router = express.Router();
  conditions.init();
  for (let policy of policies) {
    let policyName = Object.keys(policy)[0];
    let policySteps = policy[policyName];
    for (let policyStep of policySteps) {
      const condition = policyStep.condition;
      const actionCtr = actions.resolve(policyStep.action.name, policyName);
      if (!actionCtr) {
        throw new ConfigurationError(
          `Could not find action "${policyStep.action.name}"`);
      }
      const action = actionCtr(policyStep.action, config.gatewayConfig);

      router.use((req, res, next) => {
        if (!condition || req.matchEGCondition(condition)) {
          logger.debug('request matched condition for action', policyStep.action);
          action(req, res, next);
        } else {
          logger.debug(`request did not matched condition for action`, policyStep.action);
          next();
        }
      });
    }
  }

  return router;
}

function validateConfig (config) {
  if (!config) {
    throw new ConfigurationError('No config provided');
  }
  if (!config.pipelines) {
    throw new ConfigurationError('No pipelines found');
  }
  if (!config.apiEndpoints) {
    throw new ConfigurationError('No apiEndpoints found');
  }
}
