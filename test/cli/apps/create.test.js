const assert = require('assert');
const environment = require('../../fixtures/cli/environment');
const adminHelper = require('../../common/admin-helper')();
const namespace = 'express-gateway:apps:create';
const PassThrough = require('stream').PassThrough;
const util = require('util');
const idGen = require('uuid-base62');
const helpers = require('yeoman-test');
const { checkOutput } = require('../../common/output-helper');

describe('eg apps create', () => {
  let program, env, user;
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
    });
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('creates an app from prompts with username', done => {
    env.hijack(namespace, generator => {
      let output, text;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log.ok = message => {
          text = message;
        };
        generator.stdout = message => {
          output = message;
        };

        helpers.mockPrompt(generator, {
          name: 'appy',
          redirectUri: 'http://localhost:3000/cb'
        });
      });

      generator.once('end', () => {
        return adminHelper.admin.apps.list()
          .then(data => {
            let app = data.apps[0];
            assert.equal(app.name, 'appy');
            assert.equal(app.redirectUri, 'http://localhost:3000/cb');

            assert.equal(text, `Created ${app.id}`);

            let stdoutApp = JSON.parse(output);
            assert.equal(stdoutApp.name, 'appy');
            assert.equal(stdoutApp.redirectUri, 'http://localhost:3000/cb');
            done();
          });
      });
    });

    env.argv = program.parse('apps create -u ' + user.username);
  });

  it('creates an app from prompts with user ID', done => {
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
          name: 'appy',
          redirectUri: 'http://localhost:3000/cb'
        });
      });

      generator.once('end', () => {
        return adminHelper.admin.apps.list()
          .then(data => {
            let app = data.apps[0];
            assert.equal(app.name, 'appy');
            assert.equal(app.redirectUri, 'http://localhost:3000/cb');

            assert.equal(output, `Created ${app.id}`);
            done();
          });
      });
    });

    env.argv = program.parse('apps create -u ' + user.id);
  });

  it('creates an app from properties with username', done => {
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
        return adminHelper.admin.apps.list()
          .then(data => {
            let app = data.apps[0];
            assert.equal(app.name, 'appy');
            assert.equal(app.redirectUri, 'http://localhost:3000/cb');
            assert.equal(output, `Created ${app.id}`);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse('apps create -u lala -p "name=appy" ' +
      '-p "redirectUri=http://localhost:3000/cb"');
  });

  it('creates an app from properties with user ID', done => {
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
        return adminHelper.admin.apps.list()
          .then(data => {
            let app = data.apps[0];
            assert.equal(app.name, 'appy');
            assert.equal(app.redirectUri, 'http://localhost:3000/cb');
            assert.equal(output, `Created ${app.id}`);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse(`apps create -u ${user.id} -p "name=appy" ` +
      '-p "redirectUri=http://localhost:3000/cb"');
  });

  it('creates an app from stdin', done => {
    const app = {
      name: 'appy',
      redirectUri: 'http://localhost:3000/cb'
    };

    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.log = message => {
          output = message;
        };
        generator.log.ok = message => {
          output = message;
        };

        generator.stdin = new PassThrough();
        generator.stdin.write(JSON.stringify(app), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        return adminHelper.admin.apps.list()
          .then(data => {
            let app = data.apps[0];
            assert.equal(app.name, 'appy');
            assert.equal(app.redirectUri, 'http://localhost:3000/cb');

            assert.equal(output, `Created ${app.id}`);
            done();
          });
      });
    });

    env.argv = program.parse('apps create -u lala --stdin');
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
        return adminHelper.admin.apps.list()
          .then(data => {
            let app = data.apps[0];
            assert.equal(app.name, 'appy');
            assert.equal(app.redirectUri, 'http://localhost:3000/cb');

            assert.equal(output, `${app.id}`);
            done();
          });
      });
    });

    env.argv = program.parse('apps create -u ' + user.id + ' -p "name=appy" ' +
      '-p "redirectUri=http://localhost:3000/cb" -q');
  });

  it('requires either --stdin or -u, --user flags', () => {
    const output = checkOutput(() => {
      return program.parse('apps create -p "name=appy"');
    });

    const usage = output.errors[output.errors.length - 1];

    assert.equal(usage, 'must include --stdin or -u, --user');
  });

  it('prints error on invalid JSON from stdin', done => {
    const app = {};

    env.hijack(namespace, generator => {
      let output = null;

      generator.once('run', () => {
        generator.log = message => {
          output = message;
        };
        generator.log.error = message => {
          assert.equal(message, 'Failed to insert application: name is required');
        };
        generator.log.ok = message => {
          output = message;
        };

        generator.stdin = new PassThrough();
        generator.stdin.write(JSON.stringify(app), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        assert.equal(output, null);
        done();
      });
    });

    env.argv = program.parse('apps create -u ' + user.username + ' --stdin');
  });

  it('prints error on invalid user', done => {
    const app = {};
    env.hijack(namespace, generator => {
      generator.once('run', () => {
        generator.log = message => {
          done(new Error(message));
        };
        generator.log.error = message => {
          assert.equal(message, 'Failed to insert application: name is required');
        };
        generator.log.ok = message => {
          done(new Error(message));
        };

        generator.stdin = new PassThrough();
        generator.stdin.write(JSON.stringify(app), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        done();
      });
    });

    env.argv = program.parse('apps create -u invalid --stdin');
  });

  it('prints an error on invalid property syntax', done => {
    env.hijack(namespace, generator => {
      let error;
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

    env.argv = program.parse('apps create -u lala -p "name=" ' +
      '-p "redirectUri=http://example.com/cb"');
  });
});
