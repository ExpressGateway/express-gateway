const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const idGen = require('uuid62');
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:scopes:list';

describe('eg scopes list', () => {
  let program, env, scopeName, scopeName2;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    scopeName = idGen.v4();
    scopeName2 = idGen.v4();
    return adminHelper.admin.scopes.create([scopeName, scopeName2]);
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('should show scopes list', done => {
    env.hijack(namespace, generator => {
      const output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          output[message] = true;
        };
      });

      generator.once('end', () => {
        assert.ok(output[scopeName]);
        assert.ok(output[scopeName2]);
        done();
      });
    });

    env.argv = program.parse('scopes list ');
  });

  // For now output is the same as without -q, just to check that flag is accepted
  it('prints only the scope names when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      const output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          output[message] = true;
        };
      });

      generator.once('end', () => {
        assert.ok(output[scopeName]);
        assert.ok(output[scopeName2]);
        done();
      });
    });

    env.argv = program.parse('scopes list --quiet ');
  });
});
