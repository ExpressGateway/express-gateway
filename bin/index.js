#!/usr/bin/env node

const eg = {
  get config () {
    return require('../lib/config');
  }
};

const { program } = require('./environment').bootstrap(eg);

program.parse(process.argv.slice(2));
