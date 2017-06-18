const assert = require('assert');
const fs = require('fs');
const tls = require('tls');
const path = require('path');
let config = require('../src/config');
let testHelper = require('./routing/routing.helper');

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
    clientError: 'socket hang up',
    clientResult: false
  }
}];

let serverResult;
let serverError;

describe('sni', () => {
  let servers, helper, originalGatewayConfig;
  before('setup', async() => {
    originalGatewayConfig = config.gatewayConfig;
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
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test'],
          policies: [{ test: [{ action: { name: 'test_policy' } }] }]
        }
      }
    };

    helper = testHelper();
    servers = await helper.setup({
      fakeActions: ['test_policy']
    })();

    servers.httpsApp.on('tlsClientError', function (err) {
      serverResult = null;
      serverError = err.message;
    });
    servers.httpsApp.on('secureConnection', (tlsSocket) => {
      serverResult = { sni: tlsSocket.servername, authorized: tlsSocket.authorized };
    });
  });

  testCases.forEach(tc => {
    let options = tc.clientOptions;
    tc.actual = {};
    it('sni ' + options.testTitle, (done) => {
      serverError = null;
      serverResult = null;
      options.port = servers.httpsApp.address().port;
      const client = tls.connect(options, function () {
        tc.actual.clientResult =
          /Hostname\/IP doesn't/.test(client.authorizationError || '');
        client.destroy();
        tc.actual.serverResult = serverResult;
        tc.actual.clientError = null;
        tc.actual.serverError = serverError;
        done();
      });

      client.on('error', function (err) {
        tc.actual.clientResult = false;
        tc.actual.clientError = err.message;
        tc.actual.serverError = serverError;
        tc.actual.serverResult = serverResult;
        done();
      });
    });
  });
  after('check', () => {
    testCases.forEach((tc) => {
      assert.deepStrictEqual(tc.actual.serverResult, tc.expected.serverResult);
      assert.equal(tc.actual.clientResult, tc.expected.clientResult);
      assert.equal(tc.actual.clientError, tc.expected.clientError);
      assert.equal(tc.actual.serverError, tc.expected.serverError);
    });
    config.gatewayConfig = originalGatewayConfig;
    helper.cleanup();
  });
});

function loadPEM (n) {
  return fs.readFileSync(path.join(__dirname, './fixtures', `${n}.pem`));
}
