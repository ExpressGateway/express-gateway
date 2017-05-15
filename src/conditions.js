const minimatch = require('minimatch')
const express = require('express')
const debug = require('debug')("gateway");

const predefinedConditions = {
  always: function(_req) {
    return true;
  },

  never: function(_req) {
    // Not sure if anyone would ever use this in real life, but it is a
    // "legitimate" condition, and is useful during tests.
    return false;
  },

  allOf: function(req, actionConfig) {
    return actionConfig.conditions.every(subItem => req.matchEGCondition(subItem));
  },

  oneOf: function(req, actionConfig) {
    return actionConfig.conditions.some(subItem => req.matchEGCondition(subItem));
  },

  not: function(req, actionConfig) {
    return !req.matchEGCondition(actionConfig.condition);
  },

  pathMatch: function(req, actionConfig) {
    return req.url.match(new RegExp(actionConfig.pattern)) != null;
  },

  pathExact: function(req, actionConfig) {
    return req.url === actionConfig.path;
  },

  method: function(req, actionConfig) {
    if (Array.isArray(actionConfig.methods)) {
      return actionConfig.methods.includes(req.method);
    } else {
      return req.method === actionConfig.methods;
    }
  },

  hostMatch: function(req, actionConfig) {
    if (req.headers.host) {
      return minimatch(req.headers.host, actionConfig.pattern);
    }
    return false;
  }
};

module.exports.init = function() {
  const conditions = Object.assign({}, predefinedConditions);

  //extending express.request
  express.request.matchEGCondition = function(conditionConfig) {
    debug('matchEGCondition for %j', conditionConfig);
    const func = conditions[conditionConfig.name];
    if (!func) {
      debug(`warning: condition not found for ${conditionConfig.name}`);
      return null;
    } else {
      return func(this, conditionConfig);
    }
  }
  return {
    register: function({ name, handler }) {
      conditions[name] = handler
    },
  }
}