const assert = require('assert');

const mock = require('mock-require');
mock('redis', require('fakeredis'));

const db = require('../../../lib/db')();
const environment = require('../../fixtures/cli/environment');
const userService = require('../../../lib/services').user;
const appService = require('../../../lib/services').application;

const namespace = 'express-gateway:apps:info';

describe('eg apps info', () => {
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

  it('returns app info', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        const app = JSON.parse(output);
        assert.equal(app.id, appId);
        assert.equal(app.name, 'appy');
        assert.equal(app.redirectUri, 'http://localhost:3000/cb');
        assert.equal(app.isActive, true);
        assert.equal(app.userId, userId);

        done();
      });
    });

    env.argv = program.parse(`apps info ${appId}`);
  });
});
