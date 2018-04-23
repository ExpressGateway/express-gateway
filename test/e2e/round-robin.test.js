const should = require('should');
const request = require('superagent');
const fs = require('fs');
const path = require('path');

const cliHelper = require('../common/cli.helper');
const gwHelper = require('../common/gateway.helper');

const yaml = require('js-yaml');

const { generateBackendServer, findOpenPortNumbers } = require('../common/server-helper');

describe('round-robin load @balancing @proxy', () => {
  let gatewayConfig;
  let gatewayProcess;
  const backendServers = [];
  let gatewayPort;

  before(function () {
    return findOpenPortNumbers(4).then(ports => {
      gatewayConfig = yaml.load(fs.readFileSync(path.resolve('lib/config/gateway.config.yml')));

      gatewayPort = gatewayConfig.http.port = ports[0];

      gatewayConfig.serviceEndpoints.backend.urls = [
        `http://localhost:${ports[2]}`,
        `http://localhost:${ports[3]}`
      ];

      return cliHelper.bootstrapFolder()
        .then(dirInfo => gwHelper.startGatewayInstance({ dirInfo, gatewayConfig }))
        .then(gwInfo => {
          gatewayProcess = gwInfo.gatewayProcess;
          backendServers.push(gwInfo.backendServer);
          gatewayPort = gwInfo.gatewayPort;
          return generateBackendServer(ports[3]);
        })
        .then(server => backendServers.push(server));
    });
  });

  after((done) => {
    gatewayProcess.kill();
    backendServers[0].close(() => backendServers[1].close(done));
  });

  it('proxies with a round-robin balancer', done => {
    const messages = [];

    request
      .get(`http://localhost:${gatewayPort}/round-robin`)
      .end((err, res) => {
        if (err) return done(err);
        should(res.statusCode).be.eql(200);
        messages.push(res.text);

        request
          .get(`http://localhost:${gatewayPort}/round-robin`)
          .end((err, res) => {
            if (err) return done(err);
            should(res.statusCode).be.eql(200);
            messages.push(res.text);

            request
              .get(`http://localhost:${gatewayPort}/round-robin`)
              .end((err, res) => {
                if (err) return done(err);
                should(res.statusCode).be.eql(200);
                messages.push(res.text);
                should(messages[0]).not.eql(messages[1]);
                should(messages[0]).eql(messages[2]);
                done();
              });
          });
      });
  });
});
