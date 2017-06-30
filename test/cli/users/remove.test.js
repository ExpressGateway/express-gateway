const assert = require('assert');

const mock = require('mock-require');
mock('redis', require('fakeredis'));

const db = require('../../../lib/db')();
const environment = require('../../fixtures/cli/environment');
const redisConfig = require('../../../lib/config').systemConfig.db.redis;
const userService = require('../../../lib/services').user;

const namespace = 'express-gateway:users:remove';

describe('eg users remove', () => {
  let program, env, userId;

  before(() => {
    ({ program, env } = environment.bootstrap());
  });

  beforeEach(() => {
    env.prepareHijack();
    return userService.insert({
      username: 'lala',
      firstname: 'La',
      lastname: 'Deeda'
    })
    .then(user => {
      userId = user.id;
      return userService.insert({
        username: 'lala2',
        firstname: 'La2',
        lastname: 'Deeda2'
      });
    });
  });

  afterEach(done => {
    env.resetHijack();

    db.flushdbAsync()
    .then(didSucceed => {
      if (!didSucceed) {
        // eslint-disable-next-line no-console
        console.error('Failed to flush the database');
      }

      done();
    })
    .catch(err => {
      assert(!err);
      done();
    });
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
        db.smembersAsync(redisConfig.namespace + '-username:lala')
          .then(userId => {
            return db.hgetallAsync(redisConfig.namespace + '-user:' + userId[0])
              .then(user => {
                assert.equal(user, null);
                assert.equal(output, 'Removed lala');

                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('users remove lala');
  });

  it('removes a user by user ID', done => {
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
        db.smembersAsync(redisConfig.namespace + '-username:lala')
          .then(userIds => {
            return db.hgetallAsync(redisConfig.namespace + '-user:' + userIds[0])
              .then(user => {
                assert.equal(user, null);
                assert.equal(output, `Removed ${userId}`);

                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse(`users remove ${userId}`);
  });

  it('removes multiple users', done => {
    env.hijack(namespace, generator => {
      let output = [];
      let error = null;

      generator.once('run', () => {
        generator.log.error = message => {
          error = message;
        };
        generator.log.ok = message => {
          output.push(message);
        };
      });

      generator.once('end', () => {
        db.smembersAsync(redisConfig.namespace + '-username:lala')
          .then(userId => {
            return db.hgetallAsync(redisConfig.namespace + '-user:' + userId[0])
              .then(user => {
                assert.equal(user, null);
                assert.equal(output[0], 'Removed lala');

                assert.equal(error, null);
              });
          })
          .then(() => {
            db.smembersAsync(redisConfig.namespace + '-username:lala2')
              .then(userId => {
                return db.hgetallAsync(redisConfig.namespace + '-user:' + userId[0])
                  .then(user => {
                    assert.equal(user, null);
                    assert.equal(output[1], 'Removed lala2');

                    assert.equal(error, null);

                    done();
                  });
              });
          });
      });
    });

    env.argv = program.parse('users remove lala lala2');
  });

  it('prints only the user id when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log.error = message => {
          error = message;
        };
        generator.log = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        db.smembersAsync(redisConfig.namespace + '-username:lala')
          .then(userId => {
            return db.hgetallAsync(redisConfig.namespace + '-user:' + userId[0])
              .then(user => {
                assert.equal(user, null);
                assert(!!output);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('users remove lala -q');
  });
});
