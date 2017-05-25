'use strict';

let gateway = require('./gateway');

if (require.main === module) {
  gateway.start({
    configPath: process.argv[2],
  });
}