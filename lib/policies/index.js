const fs = require('fs');
const path = require('path');
const logger = require('../logger').policy;
const schemas = require('../schemas');

class Policies {
  constructor () {
    this.policies = {};

    const policyNames = fs
      .readdirSync(path.resolve(__dirname))
      .filter(dir => fs.lstatSync(path.resolve(__dirname, dir)).isDirectory());

    policyNames.forEach((name) => {
      const policy = require(path.resolve(__dirname, name));
      this.policies[name] = Object.assign(policy, { name });
      this.register(policy);
    });
  }

  register (policy) {
    const { name, schema } = policy;
    const action = policy.policy;

    const validate = schemas.register('policy', name, schema);

    policy.policy = (params, ...args) => {
      const validationResult = validate(params);
      if (validationResult.isValid) {
        return action(params, ...args);
      } else {
        logger.error(`Policy ${name} params validation failed`, validationResult.error);
        throw new Error(`Policy ${name} params validation failed`);
      }
    };

    this.policies[name] = policy;
  }

  resolve (policyName) {
    const policy = this.policies[policyName];

    if (!policy) {
      logger.error(`Could not find policy ${policyName}, Please make sure the plugins providing such policy
       is correctly configured in system.config file.`);
      throw new Error('POLICY_NOT_FOUND');
    }

    return policy;
  }
}

module.exports = new Policies();
