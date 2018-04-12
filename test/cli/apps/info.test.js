const should = require('should');
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
          should(app).have.property('name', 'appy');
          should(app).have.property('redirectUri', 'http://localhost:3000/cb');
          should(app).have.property('isActive', true);
          should(app).have.property('userId', user.id);
          should(app).have.property('username');

          done();
        });
      });

      env.argv = program.parse(`apps info ${listCommand()}`);
    });
  });
});
