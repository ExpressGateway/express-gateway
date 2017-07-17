'use strict';
const express = require('express');
const logger = require('../../lib/logger').test;

function generateBackendServer (port) {
  let app = express();

  app.all('*', (req, res) => {
    const port = req.connection.server.address().port;
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
