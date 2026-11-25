const { TestAdapter } = require('yeoman-test');
const environment = require('../../../bin/environment');

const defaultEg = {
  exit () {},
  get config () {
    return require('../../../lib/config');
  },
  get services () {
    return require('../../../lib/services');
  }
};

exports.bootstrap = (eg, adapter) => {
  eg = eg || defaultEg;
  adapter = adapter || new TestAdapter();

  const { program, env } = environment.bootstrap(eg, adapter);

  if (!env.hasOwnProperty('_originalCreate')) {
    env._originalCreate = env.create;
  }

  env.resetHijack = () => {
    env.create = env._originalCreate.bind(env);
    env._hijackers = {};
    env._isHijacked = false;
  };

  env.prepareHijack = () => {
    if (env._isHijacked) {
      return;
    }

    env.create = (namespace, options) => {
      const generator = env._originalCreate.bind(env)(namespace, options);

      const namespaces = Object.keys(env._hijackers);
      const generatorOptions = options && options.generatorOptions;
      if (namespaces.indexOf(namespace) !== -1 && !(generatorOptions && generatorOptions.help)) {
        const hijacker = env._hijackers[namespace];
        return Promise.resolve(generator).then(instance => {
          hijacker(instance);
          return instance;
        });
      }

      return generator;
    };
    env._isHijacked = true;
  };

  env._hijackers = {};
  env.hijack = (namespace, hijacker) => {
    env._hijackers[namespace] = hijacker;
  };

  return { program, env };
};
