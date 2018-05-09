const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const should = require('should');
const chokidar = require('chokidar');
const cpr = require('cpr');
const request = require('superagent');
const rimraf = require('rimraf');
const tmp = require('tmp');
const yaml = require('js-yaml');

const { findOpenPortNumbers } = require('../common/server-helper');

const GATEWAY_STARTUP_WAIT_TIME = 5000;
const TEST_TIMEOUT = 10000;

const baseConfigDirectory = path.join(__dirname, '../../lib/config');

describe('hot-reload', () => {
  describe('gateway config', () => {
    let testGatewayConfigPath = null;
    let testGatewayConfigData = null;
    let childProcess = null;
    let originalGatewayPort = null;
    let watcher = null;

    function startServer (options) {
      return new Promise((resolve, reject) => {
        childProcess = spawn('node', [options.modulePath], {
          cwd: options.cwd,
          env: options.env
        });
        childProcess.stdout.on('data', data => {
          const chk = /gateway http server listening on/g;
          if (chk.test(data)) {
            resolve();
          }
        });
        childProcess.on('exit', data => {
          reject(new Error('server didn\'t start'));
        });
      });
    }

    before(function (done) {
      this.timeout(TEST_TIMEOUT);
      tmp.dir((err, tempPath) => {
        if (err) {
          return done(err);
        }

        cpr(
          baseConfigDirectory,
          tempPath,
          { filter: file => file.includes('.yml') },
          (err, files) => {
            if (err) {
              return done(err);
            }

            cpr(
              path.join(__dirname, '../../lib/config/models'),
              path.join(tempPath, 'models'),
              (err, files) => {
                if (err) {
                  return done(err);
                }

                testGatewayConfigPath = path.join(
                  tempPath,
                  'gateway.config.yml'
                );

                findOpenPortNumbers(2)
                  .then(([httpPort, adminPort]) => {
                    fs.readFile(testGatewayConfigPath, (err, configData) => {
                      if (err) {
                        return done(err);
                      }

                      testGatewayConfigData = yaml.load(configData);

                      testGatewayConfigData.http.port = httpPort;
                      testGatewayConfigData.admin.port = adminPort;
                      testGatewayConfigData.serviceEndpoints.backend.url = `http://localhost:${adminPort}`;

                      originalGatewayPort = httpPort;

                      fs.writeFile(
                        testGatewayConfigPath,
                        yaml.dump(testGatewayConfigData),
                        err => {
                          if (err) {
                            return done(err);
                          }

                          const childEnv = Object.assign({}, process.env);
                          childEnv.EG_CONFIG_DIR = tempPath;

                          // Tests, by default have config watch disabled.
                          // Need to remove this paramter in the child process.
                          delete childEnv.EG_DISABLE_CONFIG_WATCH;

                          const modulePath = path.join(
                            __dirname,
                            '../..',
                            'lib',
                            'index.js'
                          );
                          const options = {
                            modulePath,
                            cwd: tempPath,
                            env: childEnv
                          };
                          startServer(options)
                            .then(res => {
                              request
                                .get(`http://localhost:${originalGatewayPort}`)
                                .end((err, res) => {
                                  should(err).not.be.undefined();
                                  should(res.unauthorized).not.be.undefined();
                                  if (err) {
                                    return done(err);
                                  }
                                  return done();
                                });
                            })
                            .catch(done);
                        }
                      );
                    });
                  })
                  .catch(done);
              }
            );
          }
        );
      });
    });

    after(function (done) {
      childProcess.kill();
      rimraf(testGatewayConfigPath, done);
    });

    beforeEach(function (done) {
      watcher = chokidar.watch(testGatewayConfigPath, {
        awaitWriteFinish: true,
        ignoreInitial: true
      });
      watcher.on('ready', done);
    });

    afterEach(function () {
      watcher.close();
    });

    describe('reloads valid gateway.config.yml', function () {
      it('will respond with a 404 - proxy policy', function (done) {
        this.timeout(TEST_TIMEOUT);
        watcher.once('change', evt => {
          setTimeout(() => {
            request
              .get(`http://localhost:${originalGatewayPort}`)
              .end((err, res) => {
                should(err).not.be.undefined();
                should(res.clientError).not.be.undefined();
                should(res.statusCode).be.eql(404);
                done();
              });
          }, GATEWAY_STARTUP_WAIT_TIME);
        });

        testGatewayConfigData.pipelines.adminAPI.policies.shift();
        fs.writeFileSync(
          testGatewayConfigPath,
          yaml.dump(testGatewayConfigData)
        );
      });
    });

    describe('uses previous config on reload of invalid gateway.config.yml', function () {
      it('will respond with 404 - empty proxy', function (done) {
        this.timeout(TEST_TIMEOUT);
        watcher.once('change', () => {
          request
            .get(`http://localhost:${originalGatewayPort}`)
            .end((err, res) => {
              should(err).not.be.undefined();
              should(res.clientError).not.be.undefined();
              should(res.statusCode).be.eql(404);
              done();
            });
        });
        // make config invalid
        fs.writeFileSync(testGatewayConfigPath, '{er:t4');
      });
    });
  });
});
