'use strict';

const MODULES = [
  './throttle',
  './proxy',
  './jwt',
  './cors',
  './log',
  './rewrite'
];

const POLICIES = MODULES.reduce((pre, modName) => {
  return Object.assign({}, pre, require(modName));
}, {});

module.exports = name => POLICIES[name];
