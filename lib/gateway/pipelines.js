const log = require('../logger').gateway;
const policies = require('../policies');
const conditions = require('../conditions');
const EgContextBase = require('./context');
const express = require('express');
const vhost = require('vhost');
const ConfigurationError = require('../errors').ConfigurationError;
let config = require('../config');

/*
 * A pipeline consists of an apiEndpoint and a set of policies.
 * To bootstrap, iterate through all pipelines and create a specific router for each.
 * Each router will handle requests to the apiEndpoints specified in its pipeline.
 *
 * An example of pipelines config:
 * pipelines: {
 *   pipeline1: {
 *     apiEndpoints: ['parrots'],
 *       policies: [
 *         {
 *           test: [
 *             {
 *               action: {
 *                 param1: 'black_beak',
 *                 param2: 'someOtherParam'
 *               }
 *             },
 *             {
 *               action: {
 *                 param1: 'red_beak',
 *                 param2: 'someOtherParam'
 *               }
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   }
 * }
 */

module.exports.bootstrap = function (app, http) {
  validateGatewayConfig();
  let apiEndpointToPipelineMap = {};

  for (let name in config.gatewayConfig.pipelines) {
    log.info(`processing pipeline ${name}`);

    let pipeline = config.gatewayConfig.pipelines[name];

    let router = configurePipeline(pipeline.policies || [], http);
    for (let apiName of pipeline.apiEndpoints) {
      apiEndpointToPipelineMap[apiName] = router;
    }
  }

  let apiEndpoints = processApiEndpoints(config.gatewayConfig.apiEndpoints);
  for (let el in apiEndpoints) {
    let host = el;
    let hostConfig = apiEndpoints[el];
    let router = express.Router();
    log.debug('processing vhost %s %j', host, hostConfig.routes);
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
        log.debug('mounting routes for apiEndpointName %s, mount %s', route.apiEndpointName, path);
        let handler = (req, res, next) => {
          log.debug('executing pipeline for api %s, mounted at %s', route.apiEndpointName, path);

          req.egContext = Object.create(new EgContextBase());
          req.egContext.req = req;
          req.egContext.res = res;
          req.egContext.apiEndpoint = route;
          return apiEndpointToPipelineMap[route.apiEndpointName](req, res, next);
        };
        if (route.methods && route.methods !== '*') {
          log.debug('methods specified, registering for each method individually');
          let methods = Array.isArray(route.methods) ? route.methods : route.methods.split(',');
          for (let method of methods) {
            let m = method.trim().toLowerCase();
            if (m) {
              router[m](path, handler);
            }
          }
        } else {
          log.debug('no methods specified. handle all mode.');
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
  log.debug('loading apiEndpoints %j', apiEndpoints);
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
      log.debug('processing host: %s, isRegex: %s', host, cfg[host].isRegex);
      let route = Object.assign({ apiEndpointName }, endpointConfig);
      log.debug('adding route to host: %s, %j', host, route);
      cfg[host].routes.push(route);
    });
  }
  return cfg;
}

function configurePipeline (pipelinePoliciesConfig, app) {
  let router = express.Router();

  if (!Array.isArray(pipelinePoliciesConfig)) {
    pipelinePoliciesConfig = [ pipelinePoliciesConfig ];
  }
  validatePipelinePolicies(pipelinePoliciesConfig);
  conditions.init();

  pipelinePoliciesConfig.forEach(policyConfig => {
    let policyName = Object.keys(policyConfig)[0];
    let policySteps = policyConfig[policyName];
    let policy;

    if (!policySteps) {
      policySteps = [];
    }

    if (!Array.isArray(policySteps)) {
      policySteps = [ policySteps ];
    }

    if (policies[policyName]) {
      policy = policies[policyName].policy;
    }

    if (!policy) {
      throw new ConfigurationError(`Could not find policy ${policyName}`);
    }

    if (policySteps.length === 0) {
      policySteps.push({});
    }

    for (let policyStep of policySteps) {
      let condition = policyStep.condition;

      // parameters that we pass to the policy at time of execution
      let action = policyStep.action || {};

      const policyMiddleware = policy(action, config, app);

      router.use((req, res, next) => {
        if (!condition || req.matchEGCondition(condition)) {
          log.debug('request matched condition for action', policyStep.action);
          policyMiddleware(req, res, next);
        } else {
          log.debug(`request did not matched condition for action`, policyStep.action);
          next();
        }
      });
    }
  });

  return router;
}

function validateGatewayConfig () {
  if (!config || !config.gatewayConfig) {
    throw new ConfigurationError('No config provided');
  }

  let gatewayConfig = config.gatewayConfig;

  if (!gatewayConfig.pipelines) {
    if (gatewayConfig.pipeline) {
      gatewayConfig.pipelines = Array.isArray(gatewayConfig.pipeline) ? gatewayConfig.pipeline : [ gatewayConfig.pipeline ];
    } else throw new ConfigurationError('No pipelines found');
  }
  if (!gatewayConfig.apiEndpoints) {
    if (gatewayConfig.apiEndpoint) {
      gatewayConfig.apiEndpoints = Array.isArray(gatewayConfig.apiEndpoint) ? gatewayConfig.apiEndpoint : [ gatewayConfig.apiEndpoint ];
    } else throw new ConfigurationError('No apiEndpoints found');
  }

  for (let name in gatewayConfig.pipelines) {
    let pipeline = gatewayConfig.pipelines[name];

    if (!pipeline.apiEndpoints) {
      pipeline.apiEndpoints = pipeline.apiEndpoint;
    }

    if (!Array.isArray(pipeline.apiEndpoints)) {
      pipeline.apiEndpoints = [ pipeline.apiEndpoints ];
    }

    if (!pipeline.policies) {
      pipeline.policies = pipeline.policy;
    }

    if (!Array.isArray(pipeline.policies)) {
      pipeline.policies = [ pipeline.policies ];
    }
  }
}

function validatePipelinePolicies (policies) {
  let policiesConfig = config.gatewayConfig.policies || [];

  policies.forEach(policyObj => {
    let policyNames = Object.keys(policyObj);

    if (policyNames.length !== 1) {
      throw new ConfigurationError('there should be one and only one policy per policy-object in pipeline configuration');
    }

    if (policiesConfig.indexOf(policyNames[0]) === -1) {
      throw new ConfigurationError(`${policyNames[0]} policy not declared`);
    }
  });
}
