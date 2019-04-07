const net = require('net');
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
  let completeCount = 0;
  const ports = [];
  return new Promise((resolve, reject) => {
    for (let i = 0; i < count; i++) {
      const server = net.createServer();

      server.listen(0);

      server.on('listening', () => {
        ports.push(server.address().port);

        server.once('close', () => {
          if (completeCount++ === count) {
            resolve(ports);
          }
        });

        server.close();
      });

      server.on('error', reject);
    }
  });
};

module.exports = {
  generateBackendServer,
  findOpenPortNumbers
};
