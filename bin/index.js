#!/usr/bin/env node

require('util.promisify/shim')(); // NOTE: shim for native node 8.0 uril.promisify

const eg = {
  get config () {
    return require('../lib/config');
  }
};

const { program } = require('./environment').bootstrap(eg);

program.parse(process.argv.slice(2));
