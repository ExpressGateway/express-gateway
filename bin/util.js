module.exports = {
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
