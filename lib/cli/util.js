exports.exit = () => {
  const db = require('../db')();
  const config = require('../config');

  db.quit();
  config.closeFileWatchers();
};
