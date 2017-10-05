const log = require('../logger').gateway;
const policies = require('../policies');
const EgContextBase = require('./context');
const express = require('express');
const vhost = require('vhost');
const ConfigurationError = require('../errors').ConfigurationError;

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

module.exports.bootstrap = function ({app, config}) {
  if (!validateGatewayConfig(config)) {
    return app;
  }

  const apiEndpointToPipelineMap = {};

  for (const name in config.gatewayConfig.pipelines) {
    log.info(`processing pipeline ${name}`);

    const pipeline = config.gatewayConfig.pipelines[name];

    const router = configurePipeline(pipeline.policies || [], config);
    for (const apiName of pipeline.apiEndpoints) {
      apiEndpointToPipelineMap[apiName] = router;
    }
  }

  const apiEndpoints = processApiEndpoints(config.gatewayConfig.apiEndpoints);
  for (const el in apiEndpoints) {
    const host = el;
    const hostConfig = apiEndpoints[el];
    const router = express.Router();
    log.debug('processing vhost %s %j', host, hostConfig.routes);
    for (const route of hostConfig.routes) {
      let mountPaths = [];
      route.paths = route.paths || route.path;
      if (route.pathRegex) {
        mountPaths.push(RegExp(route.pathRegex));
      } else if (route.paths && route.paths.length) {
        mountPaths = mountPaths.concat(route.paths);
      } else {
        mountPaths.push('*');
      }
      for (const path of mountPaths) {
        log.debug('mounting routes for apiEndpointName %s, mount %s', route.apiEndpointName, path);
        const handler = (req, res, next) => {
          log.debug('executing pipeline for api %s, mounted at %s', route.apiEndpointName, path);

          req.egContext = Object.create(new EgContextBase());
          req.egContext.req = req;
          req.egContext.res = res;
          req.egContext.apiEndpoint = route;
          req.egContext.apiEndpoint.scopes = req.egContext.apiEndpoint.scopes || [];
          if (!Array.isArray(req.egContext.apiEndpoint.scopes)) {
            req.egContext.apiEndpoint.scopes = [req.egContext.apiEndpoint.scopes];
          }
          return apiEndpointToPipelineMap[route.apiEndpointName](req, res, next);
        };
        if (route.methods && route.methods !== '*') {
          log.debug('methods specified, registering for each method individually');
          const methods = Array.isArray(route.methods) ? route.methods : route.methods.split(',');
          for (const method of methods) {
            const m = method.trim().toLowerCase();
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
      const virtualHost = hostConfig.isRegex ? new RegExp(host) : host;
      app.use(vhost(virtualHost, router));
    }
  }
  return app;
};

function processApiEndpoints (apiEndpoints) {
  const cfg = {};
  log.debug('loading apiEndpoints %j', apiEndpoints);
  for (const el in apiEndpoints) {
    const apiEndpointName = el;
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
      const route = Object.assign({ apiEndpointName }, endpointConfig);
      log.debug('adding route to host: %s, %j', host, route);
      cfg[host].routes.push(route);
    });
  }
  return cfg;
}

function configurePipeline (pipelinePoliciesConfig, config) {
  const router = express.Router();

  if (!Array.isArray(pipelinePoliciesConfig)) {
    pipelinePoliciesConfig = [ pipelinePoliciesConfig ];
  }
  validatePipelinePolicies(pipelinePoliciesConfig, config);

  pipelinePoliciesConfig.forEach(policyConfig => {
    const policyName = Object.keys(policyConfig)[0];
    let policySteps = policyConfig[policyName];

    if (!policySteps) {
      policySteps = [];
    }

    if (!Array.isArray(policySteps)) {
      policySteps = [ policySteps ];
    }

    const policy = policies.resolve(policyName).policy;

    if (policySteps.length === 0) {
      policySteps.push({});
    }

    for (const policyStep of policySteps) {
      const condition = policyStep.condition;

      // parameters that we pass to the policy at time of execution
      const action = policyStep.action || {};

      const policyMiddleware = policy(action, config);

      router.use((req, res, next) => {
        if (!condition || req.matchEGCondition(condition)) {
          log.debug('request matched condition for action', policyStep.action, 'in policy', policyName);
          policyMiddleware(req, res, next);
        } else {
          log.debug(`request did not matched condition for action`, policyStep.action, 'in policy', policyName);
          next();
        }
      });
    }
  });

  return router;
}

function validateGatewayConfig (config) {
  if (!config || !config.gatewayConfig) {
    throw new ConfigurationError('No config provided');
  }

  const gatewayConfig = config.gatewayConfig;

  if (!gatewayConfig.pipelines) {
    if (gatewayConfig.pipeline) {
      gatewayConfig.pipelines = Array.isArray(gatewayConfig.pipeline) ? gatewayConfig.pipeline : [ gatewayConfig.pipeline ];
    } else {
      return false;
    }
  }
  if (!gatewayConfig.apiEndpoints) {
    if (gatewayConfig.apiEndpoint) {
      gatewayConfig.apiEndpoints = Array.isArray(gatewayConfig.apiEndpoint) ? gatewayConfig.apiEndpoint : [ gatewayConfig.apiEndpoint ];
    } else {
      return false;
    }
  }

  for (const name in gatewayConfig.pipelines) {
    const pipeline = gatewayConfig.pipelines[name];

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

  return true;
}

function validatePipelinePolicies (policies, config) {
  const policiesConfig = config.gatewayConfig.policies || [];

  policies.forEach(policyObj => {
    const policyNames = Object.keys(policyObj);

    if (policyNames.length !== 1) {
      throw new ConfigurationError('there should be one and only one policy per policy-object in pipeline configuration');
    }

    if (policiesConfig.indexOf(policyNames[0]) === -1) {
      throw new ConfigurationError(`${policyNames[0]} policy not declared`);
    }
  });
}
