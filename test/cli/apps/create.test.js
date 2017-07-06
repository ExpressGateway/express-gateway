const assert = require('assert');
const PassThrough = require('stream').PassThrough;
const util = require('util');
const helpers = require('yeoman-test');
const { checkOutput } = require('../../common/output-helper');

const mock = require('mock-require');
mock('redis', require('fakeredis'));

const db = require('../../../lib/db')();
const environment = require('../../fixtures/cli/environment');
const redisConfig = require('../../../lib/config').systemConfig.db.redis;
const userService = require('../../../lib/services').user;

const namespace = 'express-gateway:apps:create';

describe('eg apps create', () => {
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

  it('creates an app from prompts with username', done => {
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
          name: 'appy',
          redirectUri: 'http://localhost:3000/cb'
        });
      });

      generator.once('end', () => {
        db.smembersAsync(`${redisConfig.namespace}-user-applications:${userId}`)
          .then(appId => {
            return db.hgetallAsync(`${redisConfig.namespace}-application:${appId[0]}`)
              .then(app => {
                assert.equal(app.name, 'appy');
                assert.equal(app.redirectUri, 'http://localhost:3000/cb');

                assert.equal(output, `Created ${appId[0]}`);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('apps create -u lala');
  });

  it('creates an app from prompts with user ID', done => {
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
          name: 'appy',
          redirectUri: 'http://localhost:3000/cb'
        });
      });

      generator.once('end', () => {
        db.smembersAsync(`${redisConfig.namespace}-user-applications:${userId}`)
          .then(appId => {
            return db.hgetallAsync(`${redisConfig.namespace}-application:${appId[0]}`)
              .then(app => {
                assert.equal(app.name, 'appy');
                assert.equal(app.redirectUri, 'http://localhost:3000/cb');

                assert.equal(output, `Created ${appId[0]}`);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('apps create -u ' + userId);
  });

  it('creates an app from properties with username', done => {
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
        db.smembersAsync(`${redisConfig.namespace}-user-applications:${userId}`)
          .then(appId => {
            return db.hgetallAsync(`${redisConfig.namespace}-application:${appId[0]}`)
              .then(app => {
                assert.equal(app.name, 'appy');
                assert.equal(app.redirectUri, 'http://localhost:3000/cb');

                assert.equal(output, `Created ${appId[0]}`);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('apps create -u lala -p "name=appy" ' +
      '-p "redirectUri=http://localhost:3000/cb"');
  });

  it('creates an app from properties with user ID', done => {
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
        db.smembersAsync(`${redisConfig.namespace}-user-applications:${userId}`)
          .then(appId => {
            return db.hgetallAsync(`${redisConfig.namespace}-application:${appId[0]}`)
              .then(app => {
                assert.equal(app.name, 'appy');
                assert.equal(app.redirectUri, 'http://localhost:3000/cb');

                assert.equal(output, `Created ${appId[0]}`);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse(`apps create -u ${userId} -p "name=appy" ` +
      '-p "redirectUri=http://localhost:3000/cb"');
  });

  it('creates an app from stdin', done => {
    const app = {
      name: 'appy',
      redirectUri: 'http://localhost:3000/cb'
    };

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
        generator.stdin.write(JSON.stringify(app), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        db.smembersAsync(`${redisConfig.namespace}-user-applications:${userId}`)
          .then(appId => {
            return db.hgetallAsync(`${redisConfig.namespace}-application:${appId[0]}`)
              .then(app => {
                assert.equal(app.name, 'appy');
                assert.equal(app.redirectUri, 'http://localhost:3000/cb');

                assert.equal(output, `Created ${appId[0]}`);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('apps create -u lala --stdin');
  });

  it('prints only the app id when using the --quiet flag', done => {
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
        db.smembersAsync(`${redisConfig.namespace}-user-applications:${userId}`)
          .then(appId => {
            return db.hgetallAsync(`${redisConfig.namespace}-application:${appId[0]}`)
              .then(app => {
                assert.equal(app.name, 'appy');
                assert.equal(app.redirectUri, 'http://localhost:3000/cb');

                assert.equal(output, appId[0]);
                assert.equal(error, null);

                done();
              });
          });
      });
    });

    env.argv = program.parse('apps create -u lala -p "name=appy" ' +
      '-p "redirectUri=http://localhost:3000/cb" -q');
  });

  it('requires either --stdin or -u, --user flags', () => {
    const output = checkOutput(() => {
      return program.parse('apps create -p "name=appy"');
    });

    const usage = output.errors[output.errors.length - 1];

    assert.equal(usage, 'must include --stdin or -u, --user');
  });

  it('prints error on invalid JSON from stdin', done => {
    const app = {};

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
        generator.stdin.write(JSON.stringify(app), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        assert.equal(error, 'Failed to insert application: name is required');
        assert.equal(output, null);

        done();
      });
    });

    env.argv = program.parse('apps create -u lala --stdin');
  });

  it('prints error on invalid user', done => {
    const app = {};

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
        generator.stdin.write(JSON.stringify(app), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        assert.equal(error, 'Failed to insert application: invalid application properties');
        assert.equal(output, null);

        done();
      });
    });

    env.argv = program.parse('apps create -u invalid --stdin');
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
        assert.equal(error, 'invalid property option: name=');
        done();
      });
    });

    env.argv = program.parse('apps create -u lala -p "name=" ' +
      '-p "redirectUri=http://example.com/cb"');
  });
});
