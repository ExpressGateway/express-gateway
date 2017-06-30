const assert = require('assert');

const mock = require('mock-require');
mock('redis', require('fakeredis'));

const db = require('../../../lib/db')();
const environment = require('../../fixtures/cli/environment');
const redisConfig = require('../../../lib/config').systemConfig.db.redis;
const userService = require('../../../lib/services').user;

const namespace = 'express-gateway:users:activate';

describe('eg users activate', () => {
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

  it('activates a user by username', done => {
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
                assert.equal(user.isActive, 'true');
                assert.equal(output, 'Activated lala');

                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('users activate lala');
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
        db.smembersAsync(redisConfig.namespace + '-username:lala')
          .then(userId => {
            return db.hgetallAsync(redisConfig.namespace + '-user:' + userId[0])
              .then(user => {
                assert.equal(user.isActive, 'true');
                assert.equal(output, `Activated ${userId}`);

                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse(`users activate ${userId}`);
  });

  it('activates multiple users', done => {
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
                assert.equal(user.isActive, 'true');
                assert.equal(output[0], 'Activated lala');

                assert.equal(error, null);
              });
          })
          .then(() => {
            db.smembersAsync(redisConfig.namespace + '-username:lala2')
              .then(userId => {
                return db.hgetallAsync(redisConfig.namespace + '-user:' + userId[0])
                  .then(user => {
                    assert.equal(user.isActive, 'true');
                    assert.equal(output[1], 'Activated lala2');

                    assert.equal(error, null);

                    done();
                  });
              });
          });
      });
    });

    env.argv = program.parse('users activate lala lala2');
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
                assert.equal(user.isActive, 'true');
                assert.equal(output, userId[0]);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('users activate lala -q');
  });
});
