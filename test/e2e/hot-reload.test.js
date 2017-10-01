const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

const assert = require('chai').assert;
const chokidar = require('chokidar');
const cpr = require('cpr');
const request = require('superagent');
const rimraf = require('rimraf');
const tmp = require('tmp');
const yaml = require('js-yaml');

const { findOpenPortNumbers } = require('../common/server-helper');

/*
    1) Copy config to a temp directory.
    2) Execute a child process with `process.env.EG_CONFIG_DIR` set to the temp directory.
    3) Watch the temp directory config file from the test.
    4) Do a baseline request to make sure the original gateway config is working.
    5) Write a new gateway config
    6) When the test watcher fires, make another HTTP request to confirm the new config is working.
    7) Clean up the temp directory.
*/

const baseConfigDirectory = path.join(__dirname, '..', 'fixtures', 'hot-reload');

describe('hot-reload', () => {
  describe('gateway config', () => {
    let testGatewayConfigPath = null;
    let testGatewayConfigData = null;
    let childProcess = null;
    let originalGatewayPort = null;

    before(function (done) {
      this.timeout(10000);
      tmp.dir((err, tempPath) => {
        if (err) {
          throw err;
        }

        cpr(baseConfigDirectory, tempPath, (err, files) => {
          if (err) {
            throw err;
          }

          testGatewayConfigPath = path.join(tempPath, 'gateway.config.yml');

          findOpenPortNumbers(3).then(ports => {
            if (err) {
              throw err;
            }

            fs.readFile(testGatewayConfigPath, (err, configData) => {
              if (err) {
                throw err;
              }

              testGatewayConfigData = yaml.load(configData);

              testGatewayConfigData.http.port = ports[0];
              testGatewayConfigData.https.port = ports[1];
              testGatewayConfigData.admin.port = ports[2];
              testGatewayConfigData.serviceEndpoints.backend.url =
                `http://localhost:${ports[2]}`;

              originalGatewayPort = ports[0];

              fs.writeFile(testGatewayConfigPath, yaml.dump(testGatewayConfigData), (err) => {
                if (err) {
                  throw err;
                }

                const childEnv = Object.assign({}, process.env);
                childEnv.EG_CONFIG_DIR = tempPath;

                // Tests, by default have config watch disabled.
                // Need to remove this paramter in the child process.
                delete childEnv.EG_DISABLE_CONFIG_WATCH;

                const modulePath = path.join(__dirname, '../..', 'lib', 'index.js');
                childProcess = fork(modulePath, [], {
                  cwd: tempPath,
                  env: childEnv
                });

                childProcess.on('error', err => {
                  throw err;
                });

                // Not ideal, but we need to make sure the process is running.
                setTimeout(() => {
                  request
                    .get(`http://localhost:${originalGatewayPort}`)
                    .end((err, res) => {
                      assert(err);
                      assert(res.unauthorized);
                      done();
                    });
                }, 5000);
              });
            });
          }).catch(err => done(err));
        });
      });
    });

    after(done => {
      childProcess.kill();
      rimraf(testGatewayConfigPath, done);
    });

    it('reloads valid gateway.config.yml', done => {
      const watchOptions = {
        awaitWriteFinish: true
      };

      const watcher = chokidar.watch(testGatewayConfigPath, watchOptions);
      watcher.once('change', (evt) => {
        request
          .get(`http://localhost:${originalGatewayPort}`)
          .end((err, res) => {
            assert(err);
            assert(res.clientError);
            assert.equal(res.statusCode, 404);
            done();
          });
      });

      watcher.on('ready', () => {
        // remove key-auth policy
        testGatewayConfigData.pipelines.adminAPI.policies.shift();

        fs.writeFile(testGatewayConfigPath, yaml.dump(testGatewayConfigData), (err) => {
          if (err) {
            throw err;
          }
        });
      });
    }).timeout(10000);

    it('uses previous config on reload of invalid gateway.config.yml', done => {
      const watchOptions = {
        awaitWriteFinish: true
      };

      const watcher = chokidar.watch(testGatewayConfigPath, watchOptions);
      watcher.once('change', (evt) => {
        request
          .get(`http://localhost:${originalGatewayPort}`)
          .end((err, res) => {
            assert(err);
            assert(res.clientError);
            assert.equal(res.statusCode, 404);
            done();
          });
      });

      watcher.on('ready', () => {
        // make config invalid
        delete testGatewayConfigData.pipelines;

        fs.writeFile(testGatewayConfigPath, yaml.dump(testGatewayConfigData), (err) => {
          if (err) {
            throw err;
          }
        });
      });
    }).timeout(10000);
  });
});
