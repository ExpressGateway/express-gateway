'use strict';

const MODULES = [
  './throttle',
  './proxy',
  './jwt',
  './cors',
  './log',
  './rewrite'
];

const actions = MODULES.reduce((pre, modName) => {
  return Object.assign(pre, require(modName));
}, {});

module.exports = name => actions[name];