const express = require('express');
const logger = require('../logger').policy;
const schemas = require('../schemas');
const predefined = require('./predefined');
const conditions = {};

function register ({name, handler, schema}) {
  let validate;
  try {
    validate = schemas.register('condition', name, schema);
  } catch (err) {
    logger.warn(`warning: invalid schema for ${name} condition`, err);
    return null;
  }

  conditions[name] = (req, config) => {
    try {
      validate(config);
    } catch (err) {
      logger.warn(`warning: condition ${name} config validation failed`, err);
      return null;
    }

    return handler(req, config);
  };
}

function init () {
  predefined.forEach(register);

  // extending express.request
  express.request.matchEGCondition = (conditionConfig) => {
    logger.debug('matchEGCondition for %o', conditionConfig);
    const func = conditions[conditionConfig.name];
    if (!func) {
      logger.debug(`warning: condition not found for ${conditionConfig.name}`);
      return null;
    }

    return func(this, conditionConfig);
  };

  return {
    register
  };
}

module.exports = {
  init
};
