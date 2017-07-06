const assert = require('assert');

const mock = require('mock-require');
mock('redis', require('fakeredis'));

const db = require('../../../lib/db')();
const environment = require('../../fixtures/cli/environment');
const redisConfig = require('../../../lib/config').systemConfig.db.redis;
const userService = require('../../../lib/services').user;
const appService = require('../../../lib/services').application;

const namespace = 'express-gateway:apps:remove';

describe('eg apps remove', () => {
  let program, env, userId, appId, appId2;

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
      return appService.insert({
        name: 'appy2',
        redirectUri: 'http://localhost:3002/cb'
      }, userId);
    })
    .then(app => {
      appId2 = app.id;
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

  it('removes an app', done => {
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
            assert.equal(app, null);
            assert.equal(output, `Removed ${appId}`);

            assert.equal(error, null);

            done();
          });
      });
    });

    env.argv = program.parse(`apps remove ${appId}`);
  });

  it('removes multiple apps', done => {
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
        db.hgetallAsync(`${redisConfig.namespace}-application:${appId}`)
          .then(app => {
            assert.equal(app, null);
            assert.equal(output[0], `Removed ${appId}`);

            assert.equal(error, null);

            return db.hgetallAsync(`${redisConfig.namespace}-application:${appId2}`);
          })
          .then(app => {
            assert.equal(app, null);
            assert.equal(output[1], `Removed ${appId2}`);

            assert.equal(error, null);
            done();
          });
      });
    });

    env.argv = program.parse(`apps remove ${appId} ${appId2}`);
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
        db.hgetallAsync(`${redisConfig.namespace}-application:${appId}`)
          .then(app => {
            assert.equal(app, null);
            assert.equal(output, appId);

            assert.equal(error, null);

            done();
          });
      });
    });

    env.argv = program.parse(`apps remove ${appId} -q`);
  });
});
