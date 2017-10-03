const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:credentials:list';
const idGen = require('uuid-base62');

describe('eg credentials list -c ', () => {
  let program, env, user, keyCred1;
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
      return Promise.all([
        adminHelper.admin.credentials.create(user.username, 'key-auth', {}),
        adminHelper.admin.credentials.create(user.username, 'basic-auth', {password: 'test'}),
        adminHelper.admin.credentials.create(user.username, 'oauth2', {secret: 'eg'})
      ]);
    })
    .then(([keyCred1Res, keyCred2Res, basicCredRes, oauth2CredRes]) => {
      keyCred1 = keyCred1Res;
    });
  });

  it('should show credentials', done => {
    const output = {};
    env.hijack(namespace, generator => {
      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = msg => {
          const crd = JSON.parse(msg);
          output[crd.type] = (crd.keyId || crd.secret || crd.password);
        };
      });

      generator.once('end', () => {
        assert.ok(output['oauth2']);
        assert.ok(output['basic-auth']);
        assert.equal(output['key-auth'], keyCred1.keyId);
        done();
      });
    });

    env.argv = program.parse('credentials list -c ' + user.username);
  });
});
