const assert = require('assert');
const util = require('util');
const helpers = require('yeoman-test');
const adminHelper = require('../../common/admin-helper')();
const environment = require('../../fixtures/cli/environment');
const idGen = require('uuid62');
const namespace = 'express-gateway:users:update';

describe('eg users update', () => {
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
  });

  it('updates a user from prompts by username', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log.error = message => {
          error = message;
        };
        generator.log.ok = message => {
          output = message;
        };

        helpers.mockPrompt(generator, {
          firstname: 'FirstName',
          lastname: 'LastName',
          username: user.username,
          email: user.email,
          redirectUri: user.redirectUri
        });
      });

      generator.once('end', () => {
        return adminHelper.admin.users.info(user.username)
          .then(user => {
            assert.strictEqual(user.firstname, 'FirstName');
            assert.strictEqual(user.lastname, 'LastName');

            assert.strictEqual(output, 'Updated ' + user.username);
            assert.strictEqual(error, null);

            done();
          });
      });
    });

    env.argv = program.parse('users update ' + user.username);
  });

  it('updates a user from prompts by user ID', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log.error = message => {
          error = message;
        };
        generator.log.ok = message => {
          output = message;
        };

        helpers.mockPrompt(generator, {
          firstname: 'X1',
          lastname: 'L1',
          username: user.username,
          email: user.email,
          redirectUri: user.redirectUri
        });
      });

      generator.once('end', () => {
        return adminHelper.admin.users.info(user.username)
          .then(user => {
            assert.strictEqual(user.firstname, 'X1');
            assert.strictEqual(user.lastname, 'L1');

            assert.strictEqual(output, 'Updated ' + user.id);
            assert.strictEqual(error, null);

            done();
          });
      });
    });

    env.argv = program.parse(`users update ${user.id}`);
  });

  it('updates a user from properties by username', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log.error = message => {
          error = message;
        };
        generator.log.ok = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.users.info(user.username)
          .then(user => {
            assert.strictEqual(user.firstname, 'C1');
            assert.strictEqual(user.lastname, 'D1');

            assert.strictEqual(output, 'Updated ' + user.username);
            assert.strictEqual(error, null);

            done();
          });
      });
    });

    env.argv = program.parse('users update ' + user.username +
      ' -p "firstname=C1" -p "lastname=D1"');
  });

  it('updates a user from properties by user ID', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log.error = message => {
          error = message;
        };
        generator.log.ok = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.users.info(user.id)
          .then(user => {
            assert.strictEqual(user.firstname, 'T1');
            assert.strictEqual(user.lastname, 'T2');

            assert.strictEqual(output, 'Updated ' + user.id);
            assert.strictEqual(error, null);

            done();
          });
      });
    });

    env.argv = program.parse(`users update ${user.id} ` +
      '-p "firstname=T1" -p "lastname=T2"');
  });

  it('prints only the user id when using the --quiet flag', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log.error = message => {
          error = message;
        };
        generator.stdout = message => {
          output = message;
        };
      });

      generator.once('end', () => {
        return adminHelper.admin.users.info(user.id)
          .then(user => {
            assert.strictEqual(user.firstname, 'H1');
            assert.strictEqual(user.lastname, 'H2');

            assert.strictEqual(output, user.id);
            assert.strictEqual(error, null);

            done();
          });
      });
    });

    env.argv = program.parse('users update ' + user.id +
      ' -p "firstname=H1" -p "lastname=H2" -q');
  });

  it('errors on unknown user', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log = message => {
          output = message;
        };
        generator.log.ok = message => {
          output = message;
        };
        generator.log.error = message => {
          error = message;
        };
      });

      generator.once('end', () => {
        assert.strictEqual(output, null);
        assert.strictEqual(error, 'User not found: asdf');

        done();
      });
    });

    env.argv = program.parse('users update asdf ' +
      '-p "firstname=FirstName" -p "lastname=LastName"');
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
        assert.strictEqual(error, 'invalid property option: username=');
        done();
      });
    });

    env.argv = program.parse('users update lala -p "username=" ' +
      '-p "firstname=FirstName" -p "lastname=LastName"');
  });
});
