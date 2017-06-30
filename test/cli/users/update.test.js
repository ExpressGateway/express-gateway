const assert = require('assert');
const util = require('util');
const helpers = require('yeoman-test');

const mock = require('mock-require');
mock('redis', require('fakeredis'));

const db = require('../../../lib/db')();
const environment = require('../../fixtures/cli/environment');
const redisConfig = require('../../../lib/config').systemConfig.db.redis;
const userService = require('../../../lib/services').user;

const namespace = 'express-gateway:users:update';

describe('eg users update', () => {
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

  it('updates a user from prompts by username', done => {
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

        helpers.mockPrompt(generator, {
          firstname: 'FirstName',
          lastname: 'LastName',
          email: '_',      // can't have empty values,
          redirectUri: '_' // limitation of yeoman-test.DummyPrompt
        });
      });

      generator.once('end', () => {
        db.smembersAsync(redisConfig.namespace + '-username:lala')
          .then(userId => {
            return db.hgetallAsync(redisConfig.namespace + '-user:' + userId[0])
              .then(user => {
                assert.equal(user.firstname, 'FirstName');
                assert.equal(user.lastname, 'LastName');

                assert.equal(output, 'Updated lala');
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('users update lala');
  });

  it('updates a user from prompts by user ID', done => {
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

        helpers.mockPrompt(generator, {
          firstname: 'FirstName',
          lastname: 'LastName',
          email: '_',      // can't have empty values,
          redirectUri: '_' // limitation of yeoman-test.DummyPrompt
        });
      });

      generator.once('end', () => {
        db.smembersAsync(redisConfig.namespace + '-username:lala')
          .then(userId => {
            return db.hgetallAsync(redisConfig.namespace + '-user:' + userId[0])
              .then(user => {
                assert.equal(user.firstname, 'FirstName');
                assert.equal(user.lastname, 'LastName');

                assert.equal(output, `Updated ${userId}`);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse(`users update ${userId}`);
  });

  it('updates a user from properties by username', done => {
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
                assert.equal(user.firstname, 'FirstName');
                assert.equal(user.lastname, 'LastName');

                assert.equal(output, 'Updated lala');
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('users update lala ' +
      '-p "firstname=FirstName" -p "lastname=LastName"');
  });

  it('updates a user from properties by user ID', done => {
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
                assert.equal(user.firstname, 'FirstName');
                assert.equal(user.lastname, 'LastName');

                assert.equal(output, `Updated ${userId}`);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse(`users update ${userId} ` +
      '-p "firstname=FirstName" -p "lastname=LastName"');
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
                assert.equal(user.firstname, 'FirstName');
                assert.equal(user.lastname, 'LastName');

                assert.equal(output, userId[0]);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('users update lala ' +
      '-p "firstname=FirstName" -p "lastname=LastName" -q');
  });

  it('errors on unknown user', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log = message => {
          output = message;
        };
        generator.log.ok = message => {
          output = message;
        };
        generator.log.error = message => {
          error = message;
        };
      });

      generator.once('end', () => {
        assert.equal(output, null);
        assert.equal(error, 'User not found: asdf');

        done();
      });
    });

    env.argv = program.parse('users update asdf ' +
      '-p "firstname=FirstName" -p "lastname=LastName"');
  });

  it('prints an error on invalid property syntax', done => {
    env.hijack(namespace, generator => {
      let error = null;

      generator.once('run', () => {
        generator.log.error = (format, ...args) => {
          error = util.format(format, ...args);
        };
      });

      generator.once('end', () => {
        assert.equal(error, 'invalid property option: username=');
        done();
      });
    });

    env.argv = program.parse('users update lala -p "username=" ' +
      '-p "firstname=FirstName" -p "lastname=LastName"');
  });
});
