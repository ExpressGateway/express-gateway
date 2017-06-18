'use strict';
const logger = require('../log').policy;
const MODULES = [ // TODO: what is core what is plugin;
  './rate-limit',
  './proxy',
  './expression',
  './cors',
  './log',
  './oauth',
  './basic-auth'
];
const coreNamespace = 'EGCore';
let actions;
module.exports.init = function () {
  actions = MODULES.reduce((pre, modName) => {
    // TODO: it should not register by just name, it should call register
    return Object.assign(pre, require(modName));
  }, {});
  logger.debug('initializing actions. loaded: %j', Object.keys(actions));

  return {
    resolve: (name, namespace) => {
      logger.debug('resolving action %s policy-namespace %s', name, namespace);
      return actions[`${namespace}.${name}`] || actions[`${coreNamespace}.${name}`] || actions[name]; // TODO: it should not register by just name
    },
    register: (name, action, namespace = coreNamespace) => {
      let actionFullName = `${namespace}.${name}`;
      actions[actionFullName] = action;
      logger.debug('registering action %s', actionFullName);
    }
  };
};
