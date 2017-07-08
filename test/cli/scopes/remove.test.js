const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const idGen = require('uuid-base62');
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:scopes:remove';

describe('eg scopes remove', () => {
  let program, env, scopeName;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    scopeName = idGen.v4();
    return adminHelper.sdk.scopes.create(scopeName);
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('should rm scope', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log.ok = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        assert.equal(output, 'Removed ' + scopeName);
        return adminHelper.sdk.scopes.info(scopeName).catch(() => {
          done();
        });
      });
    });

    env.argv = program.parse('scopes remove ' + scopeName);
  });

  it('prints only the scope name when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        assert.equal(output, scopeName);
        return adminHelper.sdk.scopes.info(scopeName).catch(() => {
          done();
        });
      });
    });

    env.argv = program.parse('scopes remove --quiet ' + scopeName);
  });
});
