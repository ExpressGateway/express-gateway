'use strict';
const logger = require('../log').policy
const MODULES = [ // TODO: what is core what is plugin;
  './throttle',
  './proxy',
  './jwt',
  './cors',
  './log',
  './rewrite'
];
const coreNamespace = 'EGCore';
let actions;
module.exports.init = function() {
  actions = MODULES.reduce((pre, modName) => {
    return Object.assign(pre, require(modName));
  }, {});
  logger.debug('initializing actions. loaded: %j', Object.keys(actions));


  return {
    resolve: name => {
      logger.debug('resolving action %s', name);
      return actions[name] || actions[`${coreNamespace}.${name}`]
    },
    register: (name, action, namespace = coreNamespace) => {
      let actionFullName = `${namespace}.${name}`;
      actions[actionFullName] = action
      logger.debug('registering action %s', actionFullName);
    }
  }
}