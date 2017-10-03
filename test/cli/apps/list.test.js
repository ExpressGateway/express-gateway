const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:apps:list';

describe('eg apps list', () => {
  let program, env, user1, apps;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();

    return Promise
      .all([
        adminHelper.admin.users.create({
          username: 'user1',
          firstname: 'La',
          lastname: 'Deeda'
        }),
        adminHelper.admin.users.create({
          username: 'user2',
          firstname: 'La',
          lastname: 'Deeda'
        })
      ])
      .then(users => {
        [user1] = users;
        return Promise.all(users.map(user => {
          return Promise.all([
            adminHelper.admin.apps.create(user.id, {
              name: 'app1',
              redirectUri: 'http://localhost:3000/cb'
            }),
            adminHelper.admin.apps.create(user.id, {
              name: 'app2',
              redirectUri: 'http://localhost:3000/cb'
            })
          ]);
        }));
      })
      .then(([user1Apps, user2Apps]) => {
        apps = user1Apps.concat(user2Apps);
      });
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('should show apps list', done => {
    env.hijack(namespace, generator => {
      let output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          let app = JSON.parse(message);
          output[app.id] = app;
        };
      });

      generator.once('end', () => {
        assert.equal(Object.keys(output).length, apps.length);
        for (const app of apps) {
          assert.ok(output[app.id]);
          assert.ok(output[app.id].name, app.name);
        }
        done();
      });
    });

    env.argv = program.parse('apps list');
  });

  it('should show apps with specific name', done => {
    env.hijack(namespace, generator => {
      let output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          let app = JSON.parse(message);
          output[app.id] = app;
        };
      });

      generator.once('end', () => {
        const filteredApps = apps.filter((app) => app.name === 'app1');
        assert.equal(Object.keys(output).length, filteredApps.length);
        for (const app of filteredApps) {
          assert.ok(output[app.id]);
          assert.ok(output[app.id].name, app.name);
        }
        done();
      });
    });

    env.argv = program.parse('apps list -n app1');
  });

  it('should show user apps', done => {
    env.hijack(namespace, generator => {
      let output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          let app = JSON.parse(message);
          output[app.id] = app;
        };
      });

      generator.once('end', () => {
        const filteredApps = apps.filter((app) => app.userId === user1.id);
        assert.equal(Object.keys(output).length, filteredApps.length);
        for (const app of filteredApps) {
          assert.ok(output[app.id]);
          assert.ok(output[app.id].name, app.name);
        }
        done();
      });
    });

    env.argv = program.parse(`apps list -u ${user1.id}`);
  });

  it('should show user apps with specific name', done => {
    env.hijack(namespace, generator => {
      let output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          let app = JSON.parse(message);
          output[app.id] = app;
        };
      });

      generator.once('end', () => {
        const filteredApps = apps.filter((app) => (
          app.userId === user1.id &&
          app.name === 'app1'
        ));
        assert.equal(Object.keys(output).length, filteredApps.length);
        for (const app of filteredApps) {
          assert.ok(output[app.id]);
          assert.ok(output[app.id].name, app.name);
        }
        done();
      });
    });

    env.argv = program.parse(`apps list -n app1 -u ${user1.id}`);
  });

  // For now output is the same as without -q, just to check that flag is accepted
  it('prints only the ids when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      let output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          output[message] = true;
        };
      });

      generator.once('end', () => {
        assert.equal(Object.keys(output).length, apps.length);
        for (const app of apps) {
          assert.ok(output[app.id]);
        }
        done();
      });
    });

    env.argv = program.parse('apps list --quiet');
  });
});
