const express = require('express');
const chalk = require('chalk');
const logger = require('../logger').policy;
const schemas = require('../schemas');
const predefined = require('./predefined');
const conditions = {};

function register ({ name, handler, schema }) {
  const validate = schemas.register('condition', name, schema);

  conditions[name] = (req, config) => {
    const validationResult = validate(config);
    if (validationResult.isValid) {
      return handler(req, config);
    }

    logger.error(`Condition ${chalk.default.red.bold(name)} config validation failed: ${validationResult.error}`);
    throw new Error(`CONDITION_PARAMS_VALIDATION_FAILED`);
  };
}

function init () {
  predefined.forEach(register);

  // extending express.request
  express.request.matchEGCondition = function (conditionConfig) {
    logger.debug(`matchEGCondition for ${conditionConfig}`);
    const func = conditions[conditionConfig.name];

    if (!func) {
      logger.warn(`Condition not found for ${conditionConfig.name}`);
      return null;
    }

    return func(this, conditionConfig);
  };

  return { register };
}

module.exports = { init };
