const assert = require('assert');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:apps:update';
const idGen = require('uuid62');
const util = require('util');
const helpers = require('yeoman-test');

describe('eg apps update', () => {
  let program, env, user, app1;
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
      });
  });
  it('updates an app from prompts', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
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
        return adminHelper.admin.apps.info(app1.id)
          .then(app => {
            assert.equal(app.name, 'AppName');
            assert.equal(app.redirectUri, 'http://example.com/cb');
            assert.equal(output, `Updated ${app1.id}`);
            done();
          });
      });
    });

    env.argv = program.parse(`apps update ${app1.id}`);
  });

  it('updates an app from properties', done => {
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
            assert.equal(app.name, 'AppName1');
            assert.equal(app.redirectUri, 'http://example.com/cb');
            assert.equal(output, `Updated ${app1.id}`);
            done();
          });
      });
    });

    env.argv = program.parse(`apps update ${app1.id} ` +
      '-p "name=AppName1" -p "redirectUri=http://example.com/cb"');
  });

  it('prints only the app id when using the --quiet flag', done => {
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
        return adminHelper.admin.apps.info(app1.id)
          .then(app => {
            assert.equal(app.name, 'AppName2');
            assert.equal(app.redirectUri, 'http://example.com/cb');
            assert.equal(output, `${app1.id}`);
            done();
          });
      });
    });

    env.argv = program.parse(`apps update ${app1.id} ` +
      '-p "name=AppName2" -p "redirectUri=http://example.com/cb" -q');
  });

  it('errors on unknown app ID', done => {
    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log = message => {
          output = message;
        };
        generator.log.ok = message => {
          output = message;
        };
        generator.log.error = message => {
          assert.equal(message, 'App not found: asdf');
        };
      });

      generator.once('end', () => {
        assert.equal(output, null);

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

    env.argv = program.parse(`apps update ${app1.id} -p "name=" ` +
      '-p "redirectUri=http://example.com/cb"');
  });
});
