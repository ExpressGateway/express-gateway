const fs = require('fs');
const path = require('path');
const logger = require('../logger').policy;
const ConfigurationError = require('../errors').ConfigurationError;
const schemas = require('../schemas');

class Policies {
  constructor () {
    this.policies = {};

    const policyNames = fs
      .readdirSync(path.resolve(__dirname))
      .filter(dir => fs.lstatSync(path.resolve(__dirname, dir)).isDirectory());

    policyNames.forEach((name) => {
      const policy = require(path.resolve(__dirname, name));
      this.policies[name] = Object.assign(policy, {
        name
      });
      this.register(policy);
    });
  }

  register (policy) {
    const {name, schema} = policy;
    const action = policy.policy;

    let validate;
    try {
      validate = schemas.register('policy', name, schema);
    } catch (err) {
      logger.error(`Invalid schema for ${name} policy`, err);
      return null;
    }

    policy.policy = (params, ...args) => {
      try {
        validate(params);
      } catch (err) {
        logger.warn(`warning: policy ${name} params validation failed`, err);
        return null;
      }
      return action(params, ...args);
    };

    this.policies[name] = policy;
  }

  resolve (policyName) {
    const policy = this.policies[policyName];

    if (!policy) {
      throw new ConfigurationError(`Could not find policy ${policyName}`);
    }
    return policy;
  }
}

module.exports = new Policies();
