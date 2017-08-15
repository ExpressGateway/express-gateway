const net = require('net');
const yaml = require('js-yaml');
const fs = require('fs');
const { fork } = require('child_process');
const path = require('path');
const request = require('superagent');
const { generateBackendServer } =
  require('../common/server-helper');
let gatewayPort = null;
let adminPort = null;
let backendPort = null;

// Set gateway.config or system.config yml files
module.exports.setYmlConfig = function ({ymlConfigPath, newConfig}) {
  fs.writeFileSync(ymlConfigPath, yaml.dump(newConfig));
};

// Get config by path (gateway.config.yml or system.config.yml)
module.exports.getYmlConfig = function ({ymlConfigPath}) {
  let content = fs.readFileSync();
  return yaml.load(content);
};

module.exports.findOpenPortNumbers = function (count = 1) {
  let completeCount = 0;
  const ports = [];
  return new Promise((resolve, reject) => {
    for (let i = 0; i < count; i++) {
      const server = net.createServer();

      server.listen(0);

      server.on('listening', () => {
        ports.push(server.address().port);

        server.once('close', () => {
          completeCount++;

          if (completeCount === count) {
            resolve(ports);
          }
        });
        server.close();
      });

      server.on('error', (err) => {
        reject(err);
      });
    }
  });
};

module.exports.startGatewayInstance = function ({dirInfo, gatewayConfig}) {
  return this.findOpenPortNumbers(4)
      .then(ports => {
        gatewayPort = ports[0];
        backendPort = ports[1];
        adminPort = ports[2];

        gatewayConfig.http = {port: gatewayPort};
        gatewayConfig.admin = {port: adminPort};
        gatewayConfig.serviceEndpoints = gatewayConfig.serviceEndpoints || {};
        gatewayConfig.serviceEndpoints.backend = {url: `http://localhost:${backendPort}`};
        return this.setYmlConfig({
          ymlConfigPath: dirInfo.gatewayConfigPath,
          newConfig: gatewayConfig
        });
      })
      .then(() => {
        return generateBackendServer(backendPort);
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          const childEnv = Object.assign({}, process.env);
          childEnv.EG_CONFIG_DIR = dirInfo.configDirectoryPath;

          // Tests, by default have config watch disabled.
          // Need to remove this paramter in the child process.
          delete childEnv.EG_DISABLE_CONFIG_WATCH;

          const modulePath = path.join(__dirname, '..', '..',
            'lib', 'index.js');
          let gatewayProcess = fork(modulePath, [], {
            cwd: dirInfo.basePath,
            env: childEnv
          });

          gatewayProcess.on('error', err => {
            reject(err);
          });
          let count = 0;
          let interval = setInterval(() => {
            count++; // Waiting for process to start, ignoring conn refused errors
            request
              .get(`http://localhost:${gatewayPort}/not-found`)
              .end((err, res) => {
                if (err && res && res.statusCode === 404) {
                  clearInterval(interval);
                  resolve({gatewayProcess, gatewayPort, adminPort, backendPort, dirInfo});
                } else {
                  if (count >= 25) {
                    gatewayProcess.kill();
                    clearInterval(interval);
                    reject(new Error('Failed to start Express Gateway'));
                  }
                }
              });
          }, 300);
        });
      });
};
