const express = require('express');
const flatMap = require('lodash.flatmap');
const vhost = require('vhost');
const chalk = require('chalk');
const log = require('../logger').gateway;
const policies = require('../policies');
const EgContextBase = require('./context');
const ActionParams = require('./actionParams');
const { conditions } = require('../conditions');
const conditionDefinitions = require('../conditions/predefined');

module.exports.bootstrap = function({ app, config }) {
  if (!normalizeGatewayConfig(config)) {
    return app;
  }

  const apiEndpointToPipelineMap = {};

  for (const name in config.gatewayConfig.pipelines) {
    log.verbose(`processing pipeline ${name}`);

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

        const handler = generatePipelineHandler({ path, pipeline: apiEndpointToPipelineMap[route.apiEndpointName], route });

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

  if (process.env.LOG_LEVEL === 'debug') {
    app.use((req, res, next) => {
      if (!req.route) {
        log.debug('No pipeline matched, returning 404.');
      }

      next();
    });
  }

  return app;
};

const processApiEndpoints = (apiEndpoints) => {
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
};

function configurePipeline(pipelinePoliciesConfig, config) {
  const router = express.Router({ mergeParams: true });

  if (!Array.isArray(pipelinePoliciesConfig)) {
    pipelinePoliciesConfig = [pipelinePoliciesConfig];
  }

  validatePipelinePolicies(pipelinePoliciesConfig, config.gatewayConfig.policies || []);

  pipelinePoliciesConfig.forEach(policyConfig => {
    const policyName = Object.keys(policyConfig)[0];
    let policySteps = policyConfig[policyName];

    if (!policySteps) {
      policySteps = [];
    } else if (!Array.isArray(policySteps)) {
      policySteps = [policySteps];
    }

    const policy = policies.resolve(policyName).policy;

    if (policySteps.length === 0) {
      policySteps.push({});
    }

    const middlewares = flatMap(policySteps, policyStep => {
      const conditionConfig = policyStep.condition;

      let condition;
      let middlewares;

      if (conditionConfig) {
        condition = conditions[conditionConfig.name](conditionConfig);
        const cd = conditionDefinitions.find(cd => cd.name === conditionConfig.name);
        if (cd) {
          middlewares = cd.middlewares;
        }
      }

      const action = Object.assign({}, policyStep.action, ActionParams.prototype);
      const policyMiddleware = policy(action, config);

      const fn = (req, res, next) => {
        if (!conditionConfig || condition(req)) {
          log.debug(`request matched condition in ${chalk.green(policyName)} policy `);
          policyMiddleware(req, res, next);
        } else {
          log.debug(`request did not match condition in ${chalk.green(policyName)} policy`);
          next();
        }
      };

      if (middlewares) {
        return [...middlewares, fn];
      }

      return fn;
    });

    router.use(middlewares);
  });

  return router;
}

function normalizeGatewayConfig(config) {
  if (!config || !config.gatewayConfig) {
    throw new Error('No config provided');
  }

  const gatewayConfig = config.gatewayConfig;

  if (!gatewayConfig.pipelines) {
    if (gatewayConfig.pipeline) {
      gatewayConfig.pipelines = Array.isArray(gatewayConfig.pipeline) ? gatewayConfig.pipeline : [gatewayConfig.pipeline];
    } else {
      return false;
    }
  }
  if (!gatewayConfig.apiEndpoints) {
    if (gatewayConfig.apiEndpoint) {
      gatewayConfig.apiEndpoints = Array.isArray(gatewayConfig.apiEndpoint) ? gatewayConfig.apiEndpoint : [gatewayConfig.apiEndpoint];
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
      pipeline.apiEndpoints = [pipeline.apiEndpoints];
    }

    if (!pipeline.policies) {
      pipeline.policies = pipeline.policy;
    }

    if (!Array.isArray(pipeline.policies)) {
      pipeline.policies = [pipeline.policies];
    }
  }

  return true;
}

const validatePipelinePolicies = (policies, avaiablePolicies) => {
  policies.forEach(policyObj => {
    const policyNames = Object.keys(policyObj);

    if (avaiablePolicies.indexOf(policyNames[0]) === -1) {
      log.error(`${policyNames[0]} policy not declared in the 'policies' gateway.config section`);
      throw new Error('POLICY_NOT_DECLARED');
    }
  });
};

const generatePipelineHandler = ({ path, pipeline, route }) => {
  if (!pipeline) {
    log.debug(`No suitable pipeline found for ${route.apiEndpointName}`);
    return (req, res, next) => res.sendStatus(404);
  }

  log.debug('executing pipeline for api %s, mounted at %s', route.apiEndpointName, path);

  if (!route.scopes) {
    route.scopes = [];
  } else if (!Array.isArray(route.scopes)) {
    route.scopes = [route.scopes];
  }

  return (req, res, next) => {
    req.egContext = Object.create(new EgContextBase());
    req.egContext.req = req;
    req.egContext.res = res;
    req.egContext.apiEndpoint = route;
    return pipeline(req, res, next);
  };
};
