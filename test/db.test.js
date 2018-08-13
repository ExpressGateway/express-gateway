const path = require('path');
const fs = require('fs');
const assert = require('assert');
const sinon = require('sinon');
const ioredis = require('ioredis');
const dbPath = '../lib/db';
const config = require('../lib/config');
let originalSystemConfig = config.systemConfig;

const clientKeyFile = path.join(__dirname, 'fixtures/certs/client', 'client.key');
const clientCertFile = path.join(__dirname, 'fixtures/certs/client', 'client.crt');
const chainFile = path.join(__dirname, 'fixtures/certs/chain', 'chain.pem');
const spy = sinon.spy(ioredis.prototype, 'parseOptions');

describe.skip('configured DB options', () => {
  describe('TLS keyFile, certFile and caFile', function () {
    before(() => {
      originalSystemConfig = config.systemConfig;
    });
    beforeEach(() => {
      delete require.cache[require.resolve(dbPath)];
      config.systemConfig.db.redis.emulate = false;
    });

    afterEach(() => {
      config.systemConfig = originalSystemConfig;
      ioredis.prototype.parseOptions.reset();
    });

    after(() => {
      delete require.cache[require.resolve('../lib/config')];
      ioredis.prototype.parseOptions.restore();
    });

    describe('when configured', () => {
      it('loads certificates from specified paths', () => {
        config.systemConfig.db.redis.tls = {
          keyFile: clientKeyFile,
          certFile: clientCertFile,
          caFile: chainFile
        };
        require(dbPath);

        assert.strictEqual(
          spy.getCall(0).args[0].tls.key.toString(),
          fs.readFileSync(clientKeyFile).toString()
        );

        assert.strictEqual(
          spy.getCall(0).args[0].tls.cert.toString(),
          fs.readFileSync(clientCertFile).toString()
        );

        assert.strictEqual(
          spy.getCall(0).args[0].tls.ca.toString(),
          fs.readFileSync(chainFile).toString()
        );
      });
    });

    describe('when not configured', () => {
      it('does not load certificates from specified paths', () => {
        config.systemConfig.db.redis.tls = {};
        require(dbPath);
        assert(!spy.getCall(0).args[0].tls.key);
        assert(!spy.getCall(0).args[0].tls.cert);
        assert(!spy.getCall(0).args[0].tls.ca);
      });
    });
  });
});
