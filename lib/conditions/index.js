const chalk = require('chalk');
const logger = require('../logger').policy;
const schemas = require('../schemas');
const predefined = require('./predefined');
const conditions = {};

function register({ type = 'condition', name, handler, schema }) {
  const validate = schemas.register(type, name, schema);

  conditions[name] = config => {
    const validationResult = validate(config);
    if (validationResult.isValid) {
      if (handler.length === 2) {
        return req => handler(req, config);
      }

      return handler(config);
    }

    logger.error(`Condition ${chalk.default.red.bold(name)} config validation failed: ${validationResult.error}`);
    throw new Error(`CONDITION_PARAMS_VALIDATION_FAILED`);
  };
}

function init() {
  predefined.forEach(register);
  return { register };
}

module.exports = { init, conditions };
