const minimatch = require('minimatch');
const express = require('express');
const logger = require('./logger').policy;
const {createSchemaValidation} = require('./schema');

const predefinedConditions = {
  always: function (_req) {
    return true;
  },

  never: function (_req) {
    // Not sure if anyone would ever use this in real life, but it is a
    // "legitimate" condition, and is useful during tests.
    return false;
  },

  allOf: function (req, actionConfig) {
    return actionConfig.conditions.every(subItem => req.matchEGCondition(subItem));
  },

  oneOf: function (req, actionConfig) {
    return actionConfig.conditions.some(subItem => req.matchEGCondition(subItem));
  },

  not: function (req, actionConfig) {
    return !req.matchEGCondition(actionConfig.condition);
  },

  pathMatch: function (req, actionConfig) {
    return req.url.match(new RegExp(actionConfig.pattern)) != null;
  },

  pathExact: function (req, actionConfig) {
    return req.url === actionConfig.path;
  },

  method: function (req, actionConfig) {
    if (Array.isArray(actionConfig.methods)) {
      return actionConfig.methods.includes(req.method);
    } else {
      return req.method === actionConfig.methods;
    }
  },

  hostMatch: function (req, actionConfig) {
    if (req.headers.host) {
      return minimatch(req.headers.host, actionConfig.pattern);
    }
    return false;
  },
  expression: function (req, conditionConfig) {
    return req.egContext.match(conditionConfig.expression);
  }
};

module.exports.init = function () {
  const conditions = Object.assign({}, predefinedConditions);

  // extending express.request
  express.request.matchEGCondition = function (conditionConfig) {
    logger.debug('matchEGCondition for %o', conditionConfig);
    const func = conditions[conditionConfig.name];
    if (!func) {
      logger.debug(`warning: condition not found for ${conditionConfig.name}`);
      return null;
    } else {
      return func(this, conditionConfig);
    }
  };
  return {
    register: function ({name, handler, schema}) {
      let validate;
      try {
        validate = createSchemaValidation(schema);
      } catch (err) {
        logger.error(`Invalid schema for ${name} condition`, err);
        return null;
      }

      conditions[name] = (req, config) => {
        try {
          validate(config);
        } catch (err) {
          logger.error(`Condition ${name} config validation failed`, err);
          return null;
        }

        return handler(req, config);
      };
    }
  };
};
