#!/usr/bin/env node

const eg = {
  exit () {
    const db = require('../lib/db')();
    db.quit();
  },
  get config () {
    return require('../lib/config');
  },
  get services () {
    return require('../lib/services');
  }
};

const { program } = require('./environment').bootstrap(eg);

program.parse(process.argv.slice(2));
