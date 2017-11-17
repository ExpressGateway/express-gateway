const assert = require('assert');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:apps:remove';
const idGen = require('uuid-base62');

describe('eg apps remove', () => {
  let program, env, user, app1, app2;
  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });
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
      });
  });

  it('removes an app', done => {
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
            assert.equal(output, 'Removed ' + app1.id);
            done(new Error(app));
          }).catch((err) => {
            assert.equal(err.message, 'Not Found');
            done();
          });
      });
    });

    env.argv = program.parse(`apps remove ${app1.id}`);
  });

  it('removes multiple apps', done => {
    env.hijack(namespace, generator => {
      const output = {};

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
          .then(res => {
            assert.equal(res.apps.length, 0);
            assert.ok(output['Removed ' + app1.id]);
            assert.ok(output['Removed ' + app1.id]);
            done();
          });
      });
    });

    env.argv = program.parse(`apps remove ${app1.id} ${app2.id}`);
  });

  it('prints only the app id when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.apps.info(app1.id)
          .then(app => {
            assert.equal(output, app1.id);
            done(new Error(app));
          }).catch((err) => {
            assert.equal(err.message, 'Not Found');
            done();
          });
      });
    });

    env.argv = program.parse(`apps remove ${app1.id} -q`);
  });
});
