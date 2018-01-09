const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

const should = require('should');
const cpr = require('cpr');
const request = require('superagent');
const rimraf = require('rimraf');
const tmp = require('tmp');
const yaml = require('js-yaml');

const { generateBackendServer, findOpenPortNumbers } =
  require('../common/server-helper');

const baseConfigDirectory = path.join(__dirname, '..', 'fixtures', 'round-robin');

describe('round-robin load @balancing @proxy', () => {
  let testGatewayConfigPath = null;
  let testGatewayConfigData = null;
  let childProcess = null;
  let gatewayPort = null;
  let backendPorts = null;

  before(function (done) {
    this.timeout(10000);
    tmp.dir((err, tempPath) => {
      if (err) {
        return done(err);
      }

      cpr(baseConfigDirectory, tempPath, (err, files) => {
        if (err) {
          return done(err);
        }

        cpr(path.join(__dirname, '../../lib/config/models'), path.join(tempPath, 'models'), (err, files) => {
          if (err) {
            return done(err);
          }

          testGatewayConfigPath = path.join(tempPath, 'gateway.config.yml');

          findOpenPortNumbers(4).then(ports => {
            fs.readFile(testGatewayConfigPath, (err, configData) => {
              if (err) {
                return done(err);
              }

              testGatewayConfigData = yaml.load(configData);

              testGatewayConfigData.http.port = ports[0];
              testGatewayConfigData.admin.port = ports[1];

              testGatewayConfigData.serviceEndpoints.backend.urls = [
                `http://localhost:${ports[2]}`,
                `http://localhost:${ports[3]}`
              ];

              gatewayPort = ports[0];
              backendPorts = [ports[2], ports[3]];

              generateBackendServer(ports[2])
                .then(() => {
                  return generateBackendServer(ports[3]);
                }).then(() => {
                  ;
                  fs.writeFile(testGatewayConfigPath,
                    yaml.dump(testGatewayConfigData), (err) => {
                      if (err) {
                        return done(err);
                      }

                      const childEnv = Object.assign({}, process.env);
                      childEnv.EG_CONFIG_DIR = tempPath;

                      // Tests, by default have config watch disabled.
                      // Need to remove this paramter in the child process.
                      delete childEnv.EG_DISABLE_CONFIG_WATCH;

                      const modulePath = path.join(__dirname, '..', '..', 'lib', 'index.js');
                      childProcess = fork(modulePath, [], {
                        cwd: tempPath,
                        env: childEnv
                      });

                      childProcess.on('error', err => {
                        return done(err);
                      });

                      // Not ideal, but we need to make sure the process is running.
                      setTimeout(() => {
                        request
                          .get(`http://localhost:${gatewayPort}/not-found`)
                          .end((err, res) => {
                            should(err).not.be.undefined();
                            should(res.clientError).not.be.undefined();
                            should(res.statusCode).be.eql(404);
                            done();
                          });
                      }, 5000);
                    });
                });
            });
          }).catch(done);
        });
      });
    });
  });

  after(done => {
    childProcess.kill();
    rimraf(testGatewayConfigPath, done);
  });

  it('proxies with a round-robin balancer', done => {
    const [port1, port2] = backendPorts;
    request
      .get(`http://localhost:${gatewayPort}/round-robin`)
      .end((err, res) => {
        if (err) return done(err);
        should(res.statusCode).be.eql(200);
        should(res.text).be.eql(`Hello from port ${port1}`);

        request
          .get(`http://localhost:${gatewayPort}/round-robin`)
          .end((err, res) => {
            if (err) return done(err);
            should(res.statusCode).be.eql(200);
            should(res.text).be.eql(`Hello from port ${port2}`);

            request
              .get(`http://localhost:${gatewayPort}/round-robin`)
              .end((err, res) => {
                if (err) return done(err);
                should(res.statusCode).be.eql(200);
                should(res.text).be.eql(`Hello from port ${port1}`);
                done();
              });
          });
      });
  });
});
