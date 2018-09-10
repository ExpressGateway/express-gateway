#!/usr/bin/env node

require('util.promisify/shim')(); // NOTE: shim for native node 8.0 uril.promisify

const eg = {
  get config () {
    return require('../lib/config');
  }
};

const bootstraped = require('./environment').bootstrap(eg);

if (bootstraped && bootstraped.program) {
  bootstraped.program.parse(process.argv.slice(2));
}
