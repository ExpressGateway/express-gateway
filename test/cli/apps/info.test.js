const assert = require('assert');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:apps:info';
const idGen = require('uuid62');

describe('eg apps info', () => {
  let program, env, user, app;

  before(() => adminHelper.start());

  after(() => adminHelper.stop());

  before(() => {
    return adminHelper.admin.users.create({
      username: idGen.v4(),
      firstname: 'La',
      lastname: 'Deeda'
    })
      .then(createdUser => {
        user = createdUser;

        return adminHelper.admin.apps.create(user.id, {
          name: 'appy',
          redirectUri: 'http://localhost:3000/cb'
        });
      })
      .then(createdApp => {
        app = createdApp;
        return app;
      });
  });

  beforeEach(() => {
    ({ program, env } = environment.bootstrap());
    env.prepareHijack();
  });

  afterEach(() => env.resetHijack());

  [{
    testCase: 'returns app info',
    listCommand: () => app.id
  }, {
    testCase: 'returns app info by name',
    listCommand: () => app.name
  }].forEach(({ testCase, listCommand }) => {
    it(testCase, done => {
      env.hijack(namespace, generator => {
        let output = null;

        generator.once('run', () => {
          generator.stdout = message => {
            output = message;
          };
          generator.log.error = message => {
            done(new Error(message));
          };
        });

        generator.once('end', () => {
          const app = JSON.parse(output);
          assert.equal(app.id, app.id);
          assert.equal(app.name, 'appy');
          assert.equal(app.redirectUri, 'http://localhost:3000/cb');
          assert.equal(app.isActive, true);
          assert.equal(app.userId, user.id);

          done();
        });
      });

      env.argv = program.parse(`apps info ${listCommand()}`);
    });
  });
});
