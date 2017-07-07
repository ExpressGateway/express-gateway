'use strict';

const fs = require('fs');
const path = require('path');

let policyNames = fs.readdirSync(path.resolve(__dirname))
  .filter(dir => fs.lstatSync(path.resolve(__dirname, dir)).isDirectory());

let policies = {};

policyNames.forEach(policyName => {
  policies[policyName] = require(path.resolve(__dirname, policyName));
});

module.exports = policies;
