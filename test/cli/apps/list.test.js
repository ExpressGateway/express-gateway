const assert = require('assert');
const idGen = require('uuid62');
const adminHelper = require('../../common/admin-helper')();
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:apps:list';

const generateUser = () => adminHelper.admin.users.create({
  username: idGen.v4(),
  firstname: 'La',
  lastname: 'Deeda'
});
const generateApp = (userId) => adminHelper.admin.apps.create(userId, {
  name: idGen.v4(),
  redirectUri: 'http://localhost:3000/cb'
});

describe('eg apps list', () => {
  let program, env, app1, app2;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    return generateUser()
      .then(user => Promise.all([user, generateApp(user.id), generateApp(user.id)]))
      .then(([firstApp, secondApp]) => { app1 = firstApp; app2 = secondApp; });
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

  describe('page navigation', () => {
    before(() => generateUser().then(user => Promise.all(Array(100).fill().map(() => generateApp(user.id)))));
    it('should show all the apps when they fill multiple pages', done => {
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
          assert.equal(Object.keys(output).length, 102);
          done();
        });
      });
      env.argv = program.parse('apps list -q');
    });
  });
});
