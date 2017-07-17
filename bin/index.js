#!/usr/bin/env node

const config = require('../lib/config');

const eg = {
  get config () {
    return config;
  }
};

const { program } = require('./environment').bootstrap(eg);

program.parse(process.argv.slice(2));
