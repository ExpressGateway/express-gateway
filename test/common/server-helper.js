const fp = require('find-free-port');
const express = require('express');

const generateBackendServer = port => {
  const app = express();

  app.all('*', (req, res) => {
    const port = req.connection.server.address().port;
    res.send('Hello from port ' + port);
  });
  return new Promise((resolve) => {
    const runningApp = app.listen(port || 0, () => {
      resolve({
        app: runningApp,
        port: runningApp.address().port
      });
    });
  });
};

const findOpenPortNumbers = function (count = 1) {
  return fp(3000, 3100, '127.0.0.1', count);
};

module.exports = {
  generateBackendServer,
  findOpenPortNumbers
};
