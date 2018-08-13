const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const idGen = require('uuid62');
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:scopes:create';

describe('eg scopes create', () => {
  let program, env, scopeName;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    scopeName = idGen.v4();
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('creates a scope from prompts', done => {
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
        return adminHelper.admin.scopes.info(scopeName)
          .then(res => {
            assert.strictEqual(res.scope, scopeName);
            assert.strictEqual(output, 'Created ' + scopeName);

            done();
          });
      });
    });

    env.argv = program.parse('scopes create ' + scopeName);
  });

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
        return adminHelper.admin.scopes.info(scopeName)
          .then(res => {
            assert.strictEqual(res.scope, scopeName);
            assert.strictEqual(output, res.scope);
            done();
          });
      });
    });

    env.argv = program.parse('scopes create ' + scopeName + ' -q');
  });
});
