const assert = require('assert');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:users:deactivate';
const idGen = require('uuid-base62');

describe('eg users deactivate', () => {
  let program, env, userId, username, username2;
  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    username = idGen.v4();
    username2 = idGen.v4();

    return adminHelper.admin.users.create({
      username: username,
      firstname: 'La',
      lastname: 'Deeda'
    }).then((createdUser) => {
      userId = createdUser.id;
      return adminHelper.admin.users.create({
        username: username2,
        firstname: 'La2',
        lastname: 'Deeda2'
      });
    });
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('deactivates a user by username', done => {
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
        return adminHelper.admin.users.info(username)
          .then(user => {
            assert.equal(user.isActive, false);
            assert.equal(output, 'Deactivated ' + username);
            done();
          });
      });
    });

    env.argv = program.parse('users deactivate ' + username);
  });

  it('deactivates a user by user ID', done => {
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
        return adminHelper.admin.users.info(userId)
          .then(user => {
            assert.equal(user.isActive, false);
            assert.equal(output, 'Deactivated ' + userId);
            done();
          });
      });
    });

    env.argv = program.parse(`users deactivate ${userId}`);
  });

  it('deactivates multiple users', done => {
    env.hijack(namespace, generator => {
      const output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          assert.fail(message);
        };
        generator.log.ok = message => {
          output[message] = true; // order is not garanteed, capture as object
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.users.list()
          .then(data => {
            const users = data.users;
            assert.equal(users[0].isActive, false);
            assert.equal(users[1].isActive, false);

            assert.ok(output['Deactivated ' + username]);
            assert.ok(output['Deactivated ' + username2]);
            assert.equal(Object.keys(output).length, 2);
            done();
          });
      });
    });

    env.argv = program.parse('users deactivate ' + username + ' ' + username2);
  });

  it('prints only the user id when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          assert.fail(message);
        };
        generator.stdout = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.users.info(username)
            .then(user => {
              assert.equal(user.isActive, false);
              assert.equal(output, username);
              done();
            });
      });
    });

    env.argv = program.parse('users deactivate ' + username + ' -q');
  });
});
