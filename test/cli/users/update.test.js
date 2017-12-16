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
          email: '_', // can't have empty values,
          redirectUri: '_' // limitation of yeoman-test.DummyPrompt
        });
      });

      generator.once('end', () => {
        return adminHelper.admin.users.info(user.username)
          .then(user => {
            assert.equal(user.firstname, 'FirstName');
            assert.equal(user.lastname, 'LastName');

            assert.equal(output, 'Updated ' + user.username);
            assert.equal(error, null);

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
          email: '_', // can't have empty values,
          redirectUri: '_' // limitation of yeoman-test.DummyPrompt
        });
      });

      generator.once('end', () => {
        return adminHelper.admin.users.info(user.username)
          .then(user => {
            assert.equal(user.firstname, 'X1');
            assert.equal(user.lastname, 'L1');

            assert.equal(output, 'Updated ' + user.id);
            assert.equal(error, null);

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
            assert.equal(user.firstname, 'C1');
            assert.equal(user.lastname, 'D1');

            assert.equal(output, 'Updated ' + user.username);
            assert.equal(error, null);

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
            assert.equal(user.firstname, 'T1');
            assert.equal(user.lastname, 'T2');

            assert.equal(output, 'Updated ' + user.id);
            assert.equal(error, null);

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
            assert.equal(user.firstname, 'H1');
            assert.equal(user.lastname, 'H2');

            assert.equal(output, user.id);
            assert.equal(error, null);

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
        assert.equal(output, null);
        assert.equal(error, 'User not found: asdf');

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
        assert.equal(error, 'invalid property option: username=');
        done();
      });
    });

    env.argv = program.parse('users update lala -p "username=" ' +
      '-p "firstname=FirstName" -p "lastname=LastName"');
  });
});
