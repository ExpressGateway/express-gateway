const should = require('should');
const request = require('superagent');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const cliHelper = require('../common/cli.helper');
const gwHelper = require('../common/gateway.helper');

describe('round-robin load @balancing @proxy', () => {
  let gatewayConfig, gatewayProcess, backendServers, gatewayPort;

  before(function () {
    gatewayConfig = yaml.load(fs.readFileSync(path.resolve('lib/config/gateway.config.yml')));

    return cliHelper.bootstrapFolder()
      .then(dirInfo => gwHelper.startGatewayInstance({ dirInfo, gatewayConfig, backendServers: 2 }))
      .then(gwInfo => {
        gatewayProcess = gwInfo.gatewayProcess;
        backendServers = gwInfo.backendServers;
        gatewayPort = gwInfo.gatewayPort;
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
