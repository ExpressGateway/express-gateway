const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const idGen = require('uuid62');
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:scopes:remove';

describe('eg scopes remove', () => {
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
        assert.strictEqual(output, 'Removed ' + scopeName);
        return adminHelper.admin.scopes.info(scopeName).catch(() => {
          done();
        });
      });
    });

    env.argv = program.parse('scopes remove ' + scopeName);
  });

  it('should rm multi scope', done => {
    env.hijack(namespace, generator => {
      const output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log.ok = message => {
          output[message] = true;
        };
      });

      generator.once('end', () => {
        assert.ok(output['Removed ' + scopeName]);
        assert.ok(output['Removed ' + scopeName2]);
        return adminHelper.admin.scopes.info(scopeName).catch(() => {
          return adminHelper.admin.scopes.info(scopeName2).catch(() => {
            done();
          });
        });
      });
    });

    env.argv = program.parse('scopes remove ' + scopeName + ' ' + scopeName2);
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
        assert.strictEqual(output, scopeName);
        return adminHelper.admin.scopes.info(scopeName).catch(() => {
          done();
        });
      });
    });

    env.argv = program.parse('scopes remove --quiet ' + scopeName);
  });
});
