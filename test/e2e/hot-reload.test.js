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

const GATEWAY_STARTUP_WAIT_TIME = 5000;
const TEST_TIMEOUT = 10000;

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
    let watcher = null;

    before(function (done) {
      this.timeout(TEST_TIMEOUT);
      tmp.dir((err, tempPath) => {
        if (err) {
          return done(err);
        }

        cpr(baseConfigDirectory, tempPath, (err, files) => {
          if (err) {
            return done(err);
          }

          testGatewayConfigPath = path.join(tempPath, 'gateway.config.yml');

          findOpenPortNumbers(3).then(ports => {
            fs.readFile(testGatewayConfigPath, (err, configData) => {
              if (err) {
                return done(err);
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
                      assert(err);
                      assert(res.unauthorized);
                      done();
                    });
                }, GATEWAY_STARTUP_WAIT_TIME);
              });
            });
          }).catch(done);
        });
      });
    });

    after(function (done) {
      childProcess.kill();
      rimraf(testGatewayConfigPath, done);
    });

    beforeEach(function (done) {
      watcher = chokidar.watch(testGatewayConfigPath, { awaitWriteFinish: true });
      watcher.on('ready', done);
    });

    afterEach(function () {
      watcher.close();
    });

    describe('reloads valid gateway.config.yml', function () {
      it('will respond with a 404 - proxy policy', function (done) {
        this.timeout(TEST_TIMEOUT);
        watcher.once('change', (evt) => {
          setTimeout(() => {
            request
              .get(`http://localhost:${originalGatewayPort}`)
              .end((err, res) => {
                assert(err);
                assert(res.clientError);
                assert.equal(res.statusCode, 404);
                done();
              });
          }, GATEWAY_STARTUP_WAIT_TIME);
        });

        testGatewayConfigData.pipelines.adminAPI.policies.shift();
        fs.writeFileSync(testGatewayConfigPath, yaml.dump(testGatewayConfigData));
      });
    });

    describe('uses previous config on reload of invalid gateway.config.yml', function () {
      it('will respond with 404 - empty proxy', function (done) {
        this.timeout(TEST_TIMEOUT);
        watcher.once('change', () => {
          request
            .get(`http://localhost:${originalGatewayPort}`)
            .end((err, res) => {
              assert(err);
              assert(res.clientError);
              assert.equal(res.statusCode, 404);
              done();
            });
        });
        // make config invalid
        delete testGatewayConfigData.pipelines;
        fs.writeFileSync(testGatewayConfigPath, yaml.dump(testGatewayConfigData));
      });
    });
  });
});
