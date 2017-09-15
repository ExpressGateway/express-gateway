const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const tmp = require('tmp');

require('util.promisify/shim')();

const modulePath = path.resolve(__dirname, '..', '..', 'bin', 'index.js');

module.exports.bootstrapFolder = function (options) {
  return util.promisify(tmp.dir)()
    .then(tempDir => {
      let execOptions = {
        env: Object.assign({}, process.env)
      };

      delete execOptions.env.EG_CONFIG_DIR;

      let cmd = `node ${modulePath} gateway create ` +
        `-t getting-started -n test -d ${tempDir}`;

      return new Promise((resolve, reject) => {
        const child = exec(cmd, execOptions, function (error, stdout, stderr) {
          if (error !== null) {
            reject(error);
          }
        });

        child.on('error', err => {
          reject(err);
        });

        child.on('exit', code => {
          if (code === 0) {
            resolve({
              basePath: tempDir,
              configDirectoryPath: path.join(tempDir, 'config'),
              gatewayConfigPath: path.join(tempDir, 'config', 'gateway.config.yml'),
              systemConfigPath: path.join(tempDir, 'config', 'system.config.yml')
            });
          }
        });
      });
    });
};

module.exports.runCLICommand = function ({adminPort, adminUrl, configDirectoryPath, cliArgs, cliExecOptions}) {
  // TODO: it should not depend on configFolder, API only, now the last dependency is models
  cliExecOptions = Object.assign({
    env: process.env
  }, cliExecOptions || {});

  cliExecOptions.env.EG_CONFIG_DIR = configDirectoryPath;
  cliExecOptions.env.EG_ADMIN_URL = adminUrl || `http://localhost:${adminPort}`;
  const command = ['node', modulePath].concat(cliArgs).join(' ');
  return new Promise((resolve, reject) => {
    exec(command, cliExecOptions, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const obj = JSON.parse(stdout);
        resolve(obj);
      } catch (err) {
        if (err instanceof SyntaxError) {
          resolve(stdout);
        } else {
          reject(err);
        }
      }
    });
  });
};
