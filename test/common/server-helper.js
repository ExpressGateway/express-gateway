const net = require('net');
const express = require('express');
const logger = require('../../lib/logger').test;

const generateBackendServer = port => {
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
};

const findOpenPortNumbers = (count, cb) => {
  let completeCount = 0;
  const ports = [];

  for (let i = 0; i < count; i++) {
    const server = net.createServer();

    server.listen(0);

    server.on('listening', () => {
      ports.push(server.address().port);

      server.once('close', () => {
        completeCount++;

        if (completeCount === count) {
          cb(null, ports);
        }
      });
      server.close();
    });

    server.on('error', (err) => {
      cb(err);
    });
  }
};

module.exports = {
  generateBackendServer,
  findOpenPortNumbers
};
