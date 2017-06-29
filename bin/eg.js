module.exports = {
  wrapConfig (yargs) {
    return yargs
      .string('config-dir')
      .describe('config-dir', 'Directory for gateway configuration')
      .nargs('config-dir', 1)
      .group(['config-dir'], 'Configure:')
      .help('h');
  },
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

module.exports.Generator = require('./eg-generator');
