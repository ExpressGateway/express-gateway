const assert = require('assert');
const PassThrough = require('stream').PassThrough;
const util = require('util');
const helpers = require('yeoman-test');

const mock = require('mock-require');
mock('redis', require('fakeredis'));

const db = require('../../../lib/db')();
const environment = require('../../fixtures/cli/environment');
const redisConfig = require('../../../lib/config').systemConfig.db.redis;

const namespace = 'express-gateway:users:create';

describe('eg users create', () => {
  let program, env;

  before(() => {
    ({ program, env } = environment.bootstrap());
  });

  beforeEach(() => {
    env.prepareHijack();
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

  it('creates a user from prompts', done => {
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
          username: 'lala',
          firstname: 'La',
          lastname: 'Deeda'
        });
      });

      generator.once('end', () => {
        db.smembersAsync(redisConfig.namespace + '-username:lala')
          .then(userId => {
            return db.hgetallAsync(redisConfig.namespace + '-user:' + userId[0])
              .then(user => {
                assert.equal(user.username, 'lala');
                assert.equal(user.firstname, 'La');
                assert.equal(user.lastname, 'Deeda');

                assert.equal(output, 'Created lala');
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('users create');
  });

  it('creates a user from properties', done => {
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
                assert.equal(user.username, 'lala');
                assert.equal(user.firstname, 'La');
                assert.equal(user.lastname, 'Deeda');

                assert.equal(output, 'Created lala');
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('users create -p "username=lala" ' +
      '-p "firstname=La" -p "lastname=Deeda"');
  });

  it('creates a user from stdin', done => {
    const user = { username: 'lala', firstname: 'La', lastname: 'Deeda' };

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
        generator.log.ok = message => {
          output = message;
        };

        generator.stdin = new PassThrough();
        generator.stdin.write(JSON.stringify(user), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        db.smembersAsync(redisConfig.namespace + '-username:lala')
          .then(userId => {
            return db.hgetallAsync(redisConfig.namespace + '-user:' + userId[0])
              .then(user => {
                assert.equal(user.username, 'lala');
                assert.equal(user.firstname, 'La');
                assert.equal(user.lastname, 'Deeda');

                assert.equal(output, 'Created lala');
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('users create --stdin');
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
                assert.equal(user.username, 'lala');
                assert.equal(user.firstname, 'La');
                assert.equal(user.lastname, 'Deeda');

                assert.equal(output, userId[0]);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('users create -p "username=lala" ' +
      '-p "firstname=La" -p "lastname=Deeda" -q');
  });

  it('prints error on invalid username from stdin', done => {
    const user = {};

    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log = message => {
          output = message;
        };
        generator.log.error = message => {
          error = message;
        };
        generator.log.ok = message => {
          output = message;
        };

        generator.stdin = new PassThrough();
        generator.stdin.write(JSON.stringify(user), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        assert.equal(error, 'invalid username');
        assert.equal(output, null);

        done();
      });
    });

    env.argv = program.parse('users create --stdin');
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

    env.argv = program.parse('users create -p "username=" ' +
      '-p "firstname=La" -p "lastname=Deeda"');
  });
});
