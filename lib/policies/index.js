const fs = require('fs');
const path = require('path');
const logger = require('../logger').policy;
const schemas = require('../schemas');
const bus = require('../eventBus');

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
        const act = action(params, ...args);
        return (req, res, next) => {
          bus.emit('EG::policy::beforePolicy', params, req, res, next);
          act(req, res, next);
          bus.emit('EG::policy::afterPolicy', params, req, res, next);
        };
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
      throw new Error(`Could not find policy ${policyName}, Please check it is listed under "policies" section in gateway.config`);
    }
    return policy;
  }
}

module.exports = new Policies();
