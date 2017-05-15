'use strict';

const MODULES = [ // TODO: what is core what is plugin;
  './throttle',
  './proxy',
  './jwt',
  './cors',
  './log',
  './rewrite'
];
const coreNamespace = 'EGCore';

module.exports.init = function() {
  const actions = MODULES.reduce((pre, modName) => {
    return Object.assign(pre, require(modName));
  }, {});

  return {
    resolve: name => actions[name] || actions[`${coreNamespace}:${name}`],
    register: (name, action, namespace = coreNamespace) => {
      actions[`${namespace}:${name}`] = action
    }
  }
}