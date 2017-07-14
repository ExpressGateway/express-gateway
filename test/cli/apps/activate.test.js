const assert = require('assert');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:apps:activate';
const idGen = require('uuid-base62');

describe('eg apps activate', () => {
  let program, env, user, app1, app2;
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
    })
    .then(createdUser => {
      user = createdUser;

      return adminHelper.admin.apps.create(user.id, {
        name: 'appy1',
        redirectUri: 'http://localhost:3000/cb'
      });
    })
    .then(createdApp => {
      app1 = createdApp;
      return adminHelper.admin.apps.create(user.id, {
        name: 'appy2',
        redirectUri: 'http://localhost:3000/cb'
      });
    })
    .then(createdApp => {
      app2 = createdApp;
      return adminHelper.admin.apps.create(user.id, {
        name: 'appy2',
        redirectUri: 'http://localhost:3000/cb'
      });
    })
    .then(() => adminHelper.admin.apps.deactivate(app1.id))
    .then(() => adminHelper.admin.apps.deactivate(app2.id));
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('activates an app', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log.ok = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.apps.info(app1.id)
          .then(app => {
            assert.equal(app.isActive, true);
            assert.equal(output, 'Activated ' + app1.id);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse(`apps activate ${app1.id}`);
  });

  it('activates multiple apps', done => {
    env.hijack(namespace, generator => {
      let output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log.ok = message => {
          output[message] = true;
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.apps.list()
          .then(data => {
            let apps = data.apps;
            assert.equal(apps[0].isActive, true);
            assert.equal(apps[1].isActive, true);

            assert.ok(output['Activated ' + app1.id]);
            assert.ok(output['Activated ' + app2.id]);
            assert.equal(Object.keys(output).length, 2);
            done();
          });
      });
    });
    env.argv = program.parse(`apps activate ${app1.id} ${app2.id}`);
  });

  it('prints only the app id when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.apps.info(app1.id)
          .then(app => {
            assert.equal(app.isActive, true);
            assert.equal(output, app1.id);
            done();
          });
      });
    });

    env.argv = program.parse(`apps activate ${app1.id} -q`);
  });
});
