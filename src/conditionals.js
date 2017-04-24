'use strict';

const minimatch = require('minimatch');

function run(context, conditionConfig) {
  const func = CONDITIONALS[conditionConfig.name];
  if (!func) {
    return null;
  } else {
    return func(context, conditionConfig);
  }
}

const CONDITIONALS = module.exports = {
  run,

  always: function(_req) {
    return true;
  },

  never: function(_req) {
    // Not sure if anyone would ever use this in real life, but it is a
    // "legitimate" conditional, and is useful during tests.
    return false;
  },

  allOf: function(req, ...subItems) {
    return subItems.every(subItem => run(req, subItem));
  },

  oneOf: function(req, ...subItems) {
    return subItems.some(subItem => run(req, subItem));
  },

  not: function(req, actionConfig) {
    return !run(req, actionConfig.condition);
  },

  pathMatch: function(req, actionConfig) {
    return req.url.match(new RegExp(actionConfig.pattern)) != null;
  },

  pathExact: function(req, actionConfig) {
    return req.url === actionConfig.path;
  },

  method: function(req, actionConfig) {
    if (Array.isArray(actionConfig.method)) {
      return actionConfig.method.includes(req.method);
    } else {
      return req.method === actionConfig.method;
    }
  },

  hostMatch: function(req, pattern) {
    if (req.headers.host) {
      return minimatch(req.headers.host, pattern);
    }
    return false;
  }
};