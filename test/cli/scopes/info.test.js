const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const idGen = require('uuid62');
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:scopes:info';

describe('eg scopes info', () => {
  let program, env, scopeName;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    scopeName = idGen.v4();
    return adminHelper.admin.scopes.create([scopeName]);
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('should show scope info', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        assert.strictEqual(output, scopeName);
        done();
      });
    });

    env.argv = program.parse('scopes info ' + scopeName);
  });

  // For now output is the same as without -q, just to check that flag is accepted
  it('prints only the scope name when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        assert.strictEqual(output, scopeName);
        done();
      });
    });

    env.argv = program.parse('scopes info --quiet ' + scopeName);
  });
});
