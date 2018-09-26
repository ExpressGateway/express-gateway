#!/usr/bin/env node

const eg = {
  get config () {
    return require('../lib/config');
  }
};

const bootstraped = require('./environment').bootstrap(eg);

if (bootstraped && bootstraped.program) {
  bootstraped.program.parse(process.argv.slice(2));
}
