const assert = require('assert');
const fs = require('fs');
const tls = require('tls');
const path = require('path');
const config = require('../lib/config');
const testHelper = require('./common/routing.helper');

const testCases = [{
  clientOptions: {
    testTitle: 'should connect to a.example.com but fail to verify client chain (ca1 issuer is not known to server)',
    key: loadPEM('agent1-key'),
    cert: loadPEM('agent1-cert'), // NOTE: agent1 cert issued by ca1
    ca: [loadPEM('ca1-cert')], // this is to bypass chain validation for self signed certs
    servername: 'a.example.com',
    rejectUnauthorized: false
  },
  expected: {
    serverError: null,
    serverResult: { sni: 'a.example.com', authorized: false },
    clientError: null,
    clientResult: true
  }
}, {
  clientOptions: {
    testTitle: 'should connect to a.example.com and authorize client because agent4 is issued by ca2, allowed by server',
    key: loadPEM('agent4-key'), // NOTE: issued by ca2
    cert: loadPEM('agent4-cert'),
    ca: [loadPEM('ca1-cert')],
    servername: 'a.example.com',
    rejectUnauthorized: false
  },
  expected: {
    serverError: null,
    serverResult: { sni: 'a.example.com', authorized: true },
    clientError: null,
    clientResult: true
  }
}, {
  clientOptions: {
    testTitle: 'should connect to b.example.com',
    key: loadPEM('agent2-key'),
    cert: loadPEM('agent2-cert'), // NOTE: issued by agent2
    ca: [loadPEM('ca2-cert')],
    servername: 'b.example.com',
    rejectUnauthorized: false
  },
  expected: {
    serverError: null,
    serverResult: { sni: 'b.example.com', authorized: false },
    clientError: null,
    clientResult: true
  }
}, {
  clientOptions: {
    testTitle: 'should fail to connect to c.another.com (not defined in EG config)',
    key: loadPEM('agent3-key'),
    cert: loadPEM('agent3-cert'), // NOTE: issued by ca2
    ca: [loadPEM('ca1-cert')],
    servername: 'c.another.com',
    rejectUnauthorized: false
  },
  expected: {
    serverError: 'cannot start TLS SNI - no cert configured',
    serverResult: null,
    clientError: 'ECONNRESET',
    clientResult: false
  }
}];

let serverResult;
let serverError;

describe('sni', () => {
  let servers, helper, originalGatewayConfig;
  before('setup', () => {
    originalGatewayConfig = config.gatewayConfig;

    helper = testHelper();
    helper.addPolicy('test', () => (req, res) => {
      res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
    });

    config.gatewayConfig = {
      https: {
        port: 10441,
        options: {
          requestCert: true,
          rejectUnauthorized: false
        },
        tls: {
          'a.example.com': {
            key: './test/fixtures/agent1-key.pem',
            cert: './test/fixtures/agent1-cert.pem',
            ca: ['./test/fixtures/ca2-cert.pem']
          },
          'b.example.com': {
            key: './test/fixtures/agent3-key.pem',
            cert: './test/fixtures/agent3-cert.pem'
          }
        }
      },
      apiEndpoints: { test: {} },
      policies: ['test'],
      pipelines: {
        pipeline1: {
          apiEndpoint: 'test',
          policies: { test: {} }
        }
      }
    };

    return helper.setup()
      .then(_servers => {
        servers = _servers;

        servers.httpsApp.on('tlsClientError', function (err, tlsSocket) {
          console.log(err);
          serverResult = null;
          serverError = err.message;
        });

        servers.httpsApp.on('secureConnection', (tlsSocket) => {
          serverResult = { sni: tlsSocket.servername, authorized: tlsSocket.authorized };
        });
      });
  });

  testCases.forEach(tc => {
    const options = tc.clientOptions;

    const actual = {};

    before(done => {
      serverError = null;
      serverResult = null;
      options.port = servers.httpsApp.address().port;

      const client = tls.connect(options, function () {
        console.log(client.authorized);
        console.log(client.authorizationError);

        actual.clientResult =
          /Hostname\/IP doesn't/.test(client.authorizationError) || client.authorizationError === 'ERR_TLS_CERT_ALTNAME_INVALID';
        client.destroy();
        actual.serverResult = serverResult;
        actual.clientError = null;
        actual.serverError = serverError;
        done();
      });

      client.on('error', function (err) {
        actual.clientResult = false;
        actual.clientError = err.code;
        actual.serverError = serverError;
        actual.serverResult = serverResult;
        done();
      });
    });

    it('sni ' + options.testTitle, () => {
      assert.deepStrictEqual(actual, tc.expected);
    });
  });

  after(() => {
    config.gatewayConfig = originalGatewayConfig;
    return helper.cleanup();
  });
});

function loadPEM(n) {
  return fs.readFileSync(path.join(__dirname, './fixtures', `${n}.pem`));
}
