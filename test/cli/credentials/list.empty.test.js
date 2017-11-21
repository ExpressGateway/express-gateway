const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:credentials:list';
const idGen = require('uuid-base62');

describe('eg credentials list -c x [no credentials]', () => {
  let program, env, user;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    return adminHelper.admin.users.create({
      username: idGen.v4(),
      firstname: 'La',
      lastname: 'Deeda'
    })
      .then(createdUser => {
        user = createdUser;
      });
  });

  it('should show friendly message if no credentials', done => {
    let message;
    env.hijack(namespace, generator => {
      generator.once('run', () => {
        generator.stdout = message => {
          done(new Error(message));
        };
        generator.log.error = msg => {
          message = msg;
        };
      });

      generator.once('end', () => {
        assert.equal(message, `Consumer ${user.username} has no credentials`);
        done();
      });
    });

    env.argv = program.parse('credentials list -c ' + user.username);
  });
});
