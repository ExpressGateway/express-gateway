const assert = require('assert');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:credential-scopes:remove';
const idGen = require('uuid/v4');

describe('eg credential:scopes remove', () => {
  let program, env, user, cred1, scope1, scope2, scope3;
  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    scope1 = idGen();
    scope2 = idGen();
    scope3 = idGen();
    return Promise.all([
      adminHelper.admin.scopes.create(scope1),
      adminHelper.admin.scopes.create(scope2),
      adminHelper.admin.scopes.create(scope3)
    ]).then(() => {
      return adminHelper.admin.users.create({
        username: idGen(),
        firstname: 'f',
        lastname: 'l'
      });
    })
      .then(createdUser => {
        user = createdUser;
        return adminHelper.admin.credentials.create(user.id, 'key-auth', {
          scopes: [scope1, scope2, scope3]
        });
      })
      .then(createdCred => {
        cred1 = createdCred;
        assert.equal(cred1.scopes.length, 3);
      });
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('remove-scopes from a credential', done => {
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
        return adminHelper.admin.credentials.info(cred1.keyId, 'key-auth')
          .then(cred => {
            assert.equal(cred.isActive, true);
            assert.ok(output[`Scope ${scope1} removed from ` + cred1.keyId]);
            assert.ok(output[`Scope ${scope2} removed from ` + cred1.keyId]);
            assert.ok(cred.scopes.indexOf(scope1) < 0);
            assert.ok(cred.scopes.indexOf(scope2) < 0);
            assert.ok(cred.scopes.indexOf(scope3) >= 0);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse(`credential:scopes remove --id ${cred1.keyId} -t key-auth ${scope1} ${scope2}`);
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
            assert.ok(cred.scopes.indexOf(scope1) < 0);
            assert.ok(cred.scopes.indexOf(scope2) < 0);
            assert.ok(cred.scopes.indexOf(scope3) >= 0);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse(`credential:scopes remove -t key-auth -q --id ${cred1.keyId} ${scope1} ${scope2}`);
  });
});
