const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const idGen = require('uuid62');
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:apps:list';

describe('eg apps list', () => {
  let program, env, user1, app1, app2;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    return adminHelper.admin.users.create({
      username: idGen.v4(),
      firstname: 'La',
      lastname: 'Deeda'
    }).then(user => {
      user1 = user;
      return adminHelper.admin.apps.create(user1.id, {
        name: idGen.v4(),
        redirectUri: 'http://localhost:3000/cb'
      });
    }).then(app => {
      app1 = app;
      return adminHelper.admin.apps.create(user1.id, {
        name: idGen.v4(),
        redirectUri: 'http://localhost:3000/cb'
      });
    })
      .then(app => {
        app2 = app;
      });
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('should show apps list', done => {
    env.hijack(namespace, generator => {
      const output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          const app = JSON.parse(message);
          output[app.name] = true;
          output[app.id] = true;
        };
      });

      generator.once('end', () => {
        assert.ok(output[app1.name]);
        assert.ok(output[app1.id]);
        assert.ok(output[app2.name]);
        assert.ok(output[app2.id]);
        done();
      });
    });

    env.argv = program.parse('apps list ');
  });

  // For now output is the same as without -q, just to check that flag is accepted
  it('prints only the ids when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      const output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          output[message] = true;
        };
      });

      generator.once('end', () => {
        assert.ok(output[app1.id]);
        assert.ok(output[app2.id]);
        done();
      });
    });

    env.argv = program.parse('apps list --quiet ');
  });
});
