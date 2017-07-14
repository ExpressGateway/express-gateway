const assert = require('assert');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:credentials:add-scopes';
const idGen = require('uuid-base62');

describe('eg credentials add-scopes', () => {
  let program, env, user, cred1, scope1, scope2;
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
      scope1 = idGen.v4();
      scope2 = idGen.v4();
      return Promise.all([
        adminHelper.admin.scopes.create(scope1),
        adminHelper.admin.scopes.create(scope2)
      ]);
    });
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('add-scopes to a credential', done => {
    env.hijack(namespace, generator => {
      let output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log.ok = message => {
          output[message] = true;
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.credentials.info(cred1.keyId, 'key-auth')
          .then(cred => {
            assert.equal(cred.isActive, true);
            assert.ok(output[`Scope ${scope1} added to ` + cred1.keyId]);
            assert.ok(output[`Scope ${scope2} added to ` + cred1.keyId]);
            assert.ok(cred.scopes.indexOf(scope1) >= 0);
            assert.ok(cred.scopes.indexOf(scope2) >= 0);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse(`credentials add-scopes --id ${cred1.keyId} -t key-auth ${scope1} ${scope2}`);
  });

  it('prints only the credential id when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log.ok = message => {
          done(new Error('should not log: ' + message));
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.credentials.info(cred1.keyId, 'key-auth')
          .then(cred => {
            assert.equal(cred.isActive, true);
            assert.ok(cred.scopes.indexOf(scope1) >= 0);
            assert.ok(cred.scopes.indexOf(scope2) >= 0);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse(`credentials add-scopes -t key-auth -q --id ${cred1.keyId} ${scope1} ${scope2}`);
  });
});
