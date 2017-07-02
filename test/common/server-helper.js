'use strict';
const express = require('express');
const logger = require('../../lib/log').test;

function generateBackendServer (port) {
  let app = express();

  app.all('*', (req, res) => {
    res.send('Hello from port ' + port);
  });
  return new Promise((resolve) => {
    let runningApp = app.listen(port, () => {
      logger.log('running test stub server at ' + port);
      resolve({
        app: runningApp
      });
    });
  });
}

module.exports = {
  generateBackendServer
};
