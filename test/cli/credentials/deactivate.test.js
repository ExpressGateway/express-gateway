const assert = require('assert');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:credentials:deactivate';
const idGen = require('uuid62');

describe('eg credentials deactivate', () => {
  let program, env, user, cred1;
  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    return adminHelper.admin.users.create({
      username: idGen.v4(),
      firstname: 'f',
      lastname: 'l'
    })
      .then(createdUser => {
        user = createdUser;
        return adminHelper.admin.credentials.create(user.id, 'key-auth', {});
      })
      .then(createdCred => {
        cred1 = createdCred;
      });
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('deactivates a credential', done => {
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
        return adminHelper.admin.credentials.info(cred1.keyId, 'key-auth')
          .then(cred => {
            assert.equal(cred.isActive, false);
            assert.equal(output, 'Deactivated ' + cred1.keyId);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse(`credentials deactivate ${cred1.keyId} -t key-auth`);
  });

  it('prints only the credential id when using the --quiet flag', done => {
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
        return adminHelper.admin.credentials.info(cred1.keyId, 'key-auth')
          .then(cred => {
            assert.equal(cred.isActive, false);
            assert.equal(output, cred1.keyId);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse(`credentials deactivate -t key-auth -q ${cred1.keyId}`);
  });
});
