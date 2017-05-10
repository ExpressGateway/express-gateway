'use strict';

const MODULES = [ // TODO: decide what is part of the core what is a plugin
  './throttle',
  './proxy',
  './jwt',
  './cors',
  './log',
  './rewrite',
];

const POLICIES = MODULES.reduce((pre, modName) => {
  return Object.assign(pre, require(modName));
}, {});

module.exports.resolve = name => POLICIES[name];
module.exports.register = (name, policy) => {
  POLICIES[name] = policy
}