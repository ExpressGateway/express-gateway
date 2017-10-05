const minimatch = require('minimatch');

module.exports = [
  {
    name: 'always',
    handler: () => true
  }, {
    // Not sure if anyone would ever use this in real life, but it is a
    // "legitimate" condition, and is useful during tests.
    name: 'never',
    handler: (_req) => false
  }, {
    name: 'allOf',
    handler: (req, actionConfig) => actionConfig.conditions.every(subItem => req.matchEGCondition(subItem))
  }, {
    name: 'oneOf',
    handler: (req, actionConfig) => actionConfig.conditions.some(subItem => req.matchEGCondition(subItem))
  }, {
    name: 'not',
    handler: (req, actionConfig) => !req.matchEGCondition(actionConfig.condition)
  }, {
    name: 'pathMatch',
    handler: (req, actionConfig) => req.url.match(new RegExp(actionConfig.pattern)) !== null
  }, {
    name: 'pathExact',
    handler: (req, actionConfig) => req.url === actionConfig.path
  }, {
    name: 'method',
    handler: (req, actionConfig) => {
      if (Array.isArray(actionConfig.methods)) {
        return actionConfig.methods.includes(req.method);
      } else {
        return req.method === actionConfig.methods;
      }
    }
  }, {
    name: 'hostMatch',
    handler: (req, actionConfig) => {
      if (req.headers.host) {
        return minimatch(req.headers.host, actionConfig.pattern);
      }
      return false;
    }
  }, {
    name: 'expression',
    handler: (req, conditionConfig) => req.egContext.match(conditionConfig.expression)
  }
];
