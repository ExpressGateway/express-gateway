const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:users:list';

describe('eg users list [no users]', () => {
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

  it('should show friendly message if no users', done => {
    env.hijack(namespace, generator => {
      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log = message => {
          assert.strictEqual(message, 'You have no users');
        };
      });

      generator.once('end', () => {
        done();
      });
    });

    env.argv = program.parse('users list ');
  });
});
