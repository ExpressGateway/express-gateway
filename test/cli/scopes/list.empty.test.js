const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:scopes:list';

describe('eg scopes list [no scopes]', () => {
  let program, env;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('should show friendly message if no scopes', done => {
    env.hijack(namespace, generator => {
      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          assert.strictEqual(message, 'You have no scopes');
        };
      });

      generator.once('end', () => {
        done();
      });
    });

    env.argv = program.parse('scopes list ');
  });
});
