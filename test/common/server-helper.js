'use strict';
const express = require('express');
const logger = require('../../src/log').test;

async function generateBackendServer(port) {
  let app = express();

  app.get('*', (req, res) => {
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