const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const environment = require('../../fixtures/cli/environment');
const idGen = require('uuid-base62');
const namespace = 'express-gateway:users:remove';

describe('eg users remove', () => {
  let program, env;
  let users;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    let promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(adminHelper.sdk.users.create({
        username: idGen.v4(),
        firstname: 'La',
        lastname: 'Deeda'
      }));
    }
    return Promise.all(promises)
      .then(createdUsers => {
        users = createdUsers;
      });
  });

  afterEach(() => {
    env.resetHijack();
  });

  it('removes a user by username', done => {
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
        return adminHelper.sdk.users.info(users[0].username)
          .catch(err => {
            assert.ok(err);
            assert.equal(output, 'Removed ' + users[0].username);
            assert.equal(error, null);
            done();
          });
      });
    });

    env.argv = program.parse('users remove ' + users[0].username);
  });

  it('removes a user by user ID', done => {
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
        return adminHelper.sdk.users.info(users[1].id)
          .catch(err => {
            assert.ok(err);
            assert.equal(output, 'Removed ' + users[1].id);
            done();
          });
      });
    });

    env.argv = program.parse(`users remove ${users[1].id}`);
  });

  it('removes multiple users', done => {
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
        return adminHelper.sdk.users.info(users[3].username)
          .catch(err => {
            assert.ok(err);
            return adminHelper.sdk.users.info(users[4].username)
              .catch(err => {
                assert.ok(err);
                assert.ok(output['Removed ' + users[3].username]);
                assert.ok(output['Removed ' + users[4].username]);
                done();
              });
          });
      });
    });

    env.argv = program.parse(`users remove ${users[3].username} ${users[4].username}`);
  });

  it('prints only the user id when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.sdk.users.info(users[2].id)
          .catch(err => {
            assert.ok(err);
            assert.equal(output, users[2].id);
            done();
          });
      });
    });

    env.argv = program.parse('users remove ' + users[2].id + ' -q');
  });
});
