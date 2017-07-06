const assert = require('assert');
const util = require('util');
const helpers = require('yeoman-test');

const mock = require('mock-require');
mock('redis', require('fakeredis'));

const db = require('../../../lib/db')();
const environment = require('../../fixtures/cli/environment');
const redisConfig = require('../../../lib/config').systemConfig.db.redis;
const userService = require('../../../lib/services').user;
const appService = require('../../../lib/services').application;

const namespace = 'express-gateway:apps:update';

describe('eg apps update', () => {
  let program, env, userId, appId;

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
      return appService.insert({
        name: 'appy',
        redirectUri: 'http://localhost:3000/cb'
      }, userId);
    })
    .then(app => {
      appId = app.id;
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

  it('updates an app from prompts', done => {
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
          name: 'AppName',
          redirectUri: 'http://example.com/cb'
        });
      });

      generator.once('end', () => {
        db.hgetallAsync(`${redisConfig.namespace}-application:${appId}`)
          .then(app => {
            assert.equal(app.name, 'AppName');
            assert.equal(app.redirectUri, 'http://example.com/cb');

            assert.equal(output, `Updated ${appId}`);
            assert.equal(error, null);

            done();
          });
      });
    });

    env.argv = program.parse(`apps update ${appId}`);
  });

  it('updates an app from properties', done => {
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
        db.hgetallAsync(`${redisConfig.namespace}-application:${appId}`)
          .then(app => {
            assert.equal(app.name, 'AppName');
            assert.equal(app.redirectUri, 'http://example.com/cb');

            assert.equal(output, `Updated ${appId}`);
            assert.equal(error, null);

            done();
          });
      });
    });

    env.argv = program.parse(`apps update ${appId} ` +
      '-p "name=AppName" -p "redirectUri=http://example.com/cb"');
  });

  it('prints only the app id when using the --quiet flag', done => {
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
      });

      generator.once('end', () => {
        db.hgetallAsync(`${redisConfig.namespace}-application:${appId}`)
          .then(app => {
            assert.equal(app.name, 'AppName');
            assert.equal(app.redirectUri, 'http://example.com/cb');

            assert.equal(output, appId);
            assert.equal(error, null);

            done();
          });
      });
    });

    env.argv = program.parse(`apps update ${appId} ` +
      '-p "name=AppName" -p "redirectUri=http://example.com/cb" -q');
  });

  it('errors on unknown app ID', done => {
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
        assert.equal(error, 'App not found: asdf');

        done();
      });
    });

    env.argv = program.parse(`apps update asdf ` +
      '-p "name=AppName" -p "redirectUri=http://example.com/cb"');
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

    env.argv = program.parse(`apps update ${appId} -p "name=" ` +
      '-p "redirectUri=http://example.com/cb"');
  });
});
