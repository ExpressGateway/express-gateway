'use strict';

const PROCESSORS = {
  throttleGroup: require('./throttleGroup'),
  throttle: require('./throttle'),
  proxy: require('./proxy')
};

module.exports = name => PROCESSORS[name];
