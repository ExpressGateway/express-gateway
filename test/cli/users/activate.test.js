const assert = require('assert');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:users:activate';
const idGen = require('uuid-base62');

describe('eg users activate', () => {
  let program, env, userId, userName, userName2;
  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    userName = idGen.v4();
    userName2 = idGen.v4();
    return adminHelper.sdk.users.create({
      username: userName,
      firstname: 'La',
      lastname: 'Deeda'
    })
    .then(user => {
      userId = user.id;
      return adminHelper.sdk.users.create({
        username: userName2,
        firstname: 'La2',
        lastname: 'Deeda2'
      });
    })
    .then(() => adminHelper.sdk.users.deactivate(userName))
    .then(() => adminHelper.sdk.users.deactivate(userName2));
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('activates a user by username', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(message);
        };
        generator.log.ok = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.sdk.users.info(userName)
          .then(user => {
            assert.equal(user.isActive, true);
            assert.equal(output, 'Activated ' + userName);
            assert.equal(error, null);
            done();
          });
      });
    });

    env.argv = program.parse('users activate ' + userName);
  });

  it('activates a user by user ID', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log.error = message => {
          error = message;
        };
        generator.log.ok = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.sdk.users.info(userId)
          .then(user => {
            assert.equal(user.isActive, true);
            assert.equal(output, 'Activated ' + userId);
            assert.equal(error, null);
            done();
          });
      });
    });

    env.argv = program.parse(`users activate ${userId}`);
  });

  it('activates multiple users', done => {
    env.hijack(namespace, generator => {
      let output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          assert.fail(message);
        };
        generator.log.ok = message => {
          output[message] = true; // order is not garanteed, capture as object
        };
      });

      generator.once('end', () => {
        return adminHelper.sdk.users.list()
          .then(data => {
            let users = data.users;
            assert.equal(users[0].isActive, true);
            assert.equal(users[1].isActive, true);

            assert.ok(output['Activated ' + userName]);
            assert.ok(output['Activated ' + userName2]);
            assert.equal(Object.keys(output).length, 2);
            done();
          });
      });
    });

    env.argv = program.parse('users activate ' + userName + ' ' + userName2);
  });
  it('prints only the user id when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          assert.fail(message);
        };
        generator.log.ok = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.sdk.users.info(userName)
            .then(user => {
              assert.equal(user.isActive, true);
              assert.equal(output, userName);
              done();
            });
      });
    });

    env.argv = program.parse('users activate ' + userName + ' -q');
  });
});
