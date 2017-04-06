'use strict';
const express = require('express');
function generateBackendServer(port) {
  let app = express();

  app.get('/', (req, res) => {
    res.send('Hello from port ' + port);
  });
  return new Promise((resolve) => {
    let runningApp = app.listen(port, () => {
      console.log(`Example app listening on port ${port}!`);
      resolve({
        app: runningApp
      });
    });
  });
}

module.exports = {
  generateBackendServer
};
