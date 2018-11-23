const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

const should = require('should');
const nsfw = require('nsfw');
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

    before(function (done) {
      this.timeout(TEST_TIMEOUT);
      tmp.dir((err, tempPath) => {
        if (err) {
          return done(err);
        }

        cpr(baseConfigDirectory, tempPath, { filter: file => file.includes('.yml') }, (err, files) => {
          if (err) {
            return done(err);
          }

          cpr(path.join(__dirname, '../../lib/config/models'), path.join(tempPath, 'models'), (err, files) => {
            if (err) {
              return done(err);
            }

            testGatewayConfigPath = path.join(tempPath, 'gateway.config.yml');

            findOpenPortNumbers(2).then(([httpPort, adminPort]) => {
              fs.readFile(testGatewayConfigPath, (err, configData) => {
                if (err) {
                  return done(err);
                }

                testGatewayConfigData = yaml.load(configData);

                testGatewayConfigData.http.port = httpPort;
                testGatewayConfigData.admin.port = adminPort;
                testGatewayConfigData.serviceEndpoints.backend.url = `http://localhost:${adminPort}`;

                originalGatewayPort = httpPort;

                fs.writeFile(testGatewayConfigPath, yaml.dump(testGatewayConfigData), (err) => {
                  if (err) {
                    return done(err);
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

                  childProcess.on('error', done);

                  // Not ideal, but we need to make sure the process is running.
                  setTimeout(() => {
                    request
                      .get(`http://localhost:${originalGatewayPort}`)
                      .end((err, res) => {
                        should(err).not.be.undefined();
                        should(res.unauthorized).not.be.undefined();
                        done();
                      });
                  }, GATEWAY_STARTUP_WAIT_TIME);
                });
              });
            }).catch(done);
          });
        });
      });
    });

    after(function (done) {
      childProcess.kill();
      rimraf(testGatewayConfigPath, done);
    });

    afterEach(function () {
      return watcher.then(w => w.stop());
    });

    describe('reloads valid gateway.config.yml', function () {
      it('will respond with a 404 - proxy policy', function (done) {
        this.timeout(TEST_TIMEOUT);
        testGatewayConfigData.pipelines.adminAPI.policies.shift();
        watcher = nsfw(testGatewayConfigPath, events => {
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
        }).then(w => {
          w.start();
          fs.writeFileSync(testGatewayConfigPath, yaml.dump(testGatewayConfigData));
          return w;
        });
      });
    });

    describe('uses previous config on reload of invalid gateway.config.yml', function () {
      it('will respond with 404 - empty proxy', function (done) {
        this.timeout(TEST_TIMEOUT);
        watcher = nsfw(testGatewayConfigPath, events => {
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
        }).then(w => {
          w.start();
          fs.writeFileSync(testGatewayConfigPath, '{er:t4');
          return w;
        });
      });
    });
  });
});
