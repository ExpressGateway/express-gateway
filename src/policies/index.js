'use strict';

const MODULES = [
  './throttle',
  './proxy',
  './jwt',
  './cors',
  './log',
  './rewrite'
];

const PROCESSORS = MODULES.reduce((pre, modName) => {
  return Object.assign({}, pre, require(modName));
}, {});

module.exports = name => PROCESSORS[name];
