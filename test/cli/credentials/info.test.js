const assert = require('assert');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:credentials:info';
const idGen = require('uuid-base62');

describe('eg credentials info', () => {
  let program, env, user, cred;
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

      return adminHelper.admin.credentials.create(user.id, 'key-auth', {});
    })
    .then(createdCred => {
      cred = createdCred;
      return cred;
    });
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('returns cred info', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log = message => {
          output = message;
        };
        generator.log.error = message => {
          done(new Error(message));
        };
      });

      generator.once('end', () => {
        const c = JSON.parse(output);
        assert.equal(c.keyId, cred.keyId);
        assert.equal(c.isActive, true);

        done();
      });
    });

    env.argv = program.parse(`credentials info -t key-auth ${cred.keyId}`);
  });
});
