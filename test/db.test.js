const path = require('path');
const fs = require('fs');
const assert = require('assert');
const sinon = require('sinon');
const fakeredis = require('fakeredis');

const dbPath = '../lib/db';
const config = require('../lib/config');
let originalSystemConfig = config.systemConfig;

const clientKeyFile = path.join(__dirname, 'fixtures/certs/client', 'client.key');
const clientCertFile = path.join(__dirname, 'fixtures/certs/client', 'client.crt');
const chainFile = path.join(__dirname, 'fixtures/certs/chain', 'chain.pem');

let db;
let EgDbEmulate;

describe('configured DB options', () => {
  describe('TLS keyFile, certFile and caFile', function () {
    before(() => {
      EgDbEmulate = process.env.EG_DB_EMULATE;
      process.env.EG_DB_EMULATE = '1';
      sinon.spy(fakeredis, 'createClient');
    });

    beforeEach(() => {
      originalSystemConfig = config.systemConfig;
      delete require.cache[require.resolve(dbPath)];
      db = require(dbPath);
    });

    afterEach(() => {
      config.systemConfig = originalSystemConfig;
    });

    after(() => {
      if (EgDbEmulate) {
        process.env.EG_DB_EMULATE = EgDbEmulate;
      } else {
        delete process.env.EG_DB_EMULATE;
      }

      fakeredis.createClient.restore();
    });

    describe('when configured', () => {
      it('loads certificates from specified paths', () => {
        config.systemConfig.db.redis.tls = {
          keyFile: clientKeyFile,
          certFile: clientCertFile,
          caFile: chainFile
        };
        assert(!config.systemConfig.db.redis.tls.key);
        assert(!config.systemConfig.db.redis.tls.cert);
        assert(!config.systemConfig.db.redis.tls.ca);

        db();

        assert.equal(
          fakeredis.createClient.getCall(0).args[0].tls.key.toString(),
          fs.readFileSync(clientKeyFile).toString()
        );

        assert.equal(
          fakeredis.createClient.getCall(0).args[0].tls.cert.toString(),
          fs.readFileSync(clientCertFile).toString()
        );

        assert.equal(
          fakeredis.createClient.getCall(0).args[0].tls.ca.toString(),
          fs.readFileSync(chainFile).toString()
        );
      });
    });

    describe('when not configured', () => {
      it('does not load certificates from specified paths', () => {
        config.systemConfig.db.redis.tls = {};

        db();

        assert(!fakeredis.createClient.getCall(0).args[0].tls.key);
        assert(!fakeredis.createClient.getCall(0).args[0].tls.cert);
        assert(!fakeredis.createClient.getCall(0).args[0].tls.ca);
      });
    });
  });
});
