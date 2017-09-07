const fs = require('fs');
const path = require('path');
const ConfigurationError = require('../errors').ConfigurationError;

class Policies {
  constructor () {
    this.policies = {};

    let policyNames = fs
      .readdirSync(path.resolve(__dirname))
      .filter(dir => fs.lstatSync(path.resolve(__dirname, dir)).isDirectory());

    policyNames.forEach(policyName => {
      this.policies[policyName] = require(path.resolve(__dirname, policyName));
    });
  }
  register (policy) {
    this.policies[policy.name] = policy;
  }

  resolve (policyName) {
    let policy = this.policies[policyName];

    if (!policy) {
      throw new ConfigurationError(`Could not find policy ${policyName}`);
    }
    return policy;
  }
}

module.exports = new Policies();
