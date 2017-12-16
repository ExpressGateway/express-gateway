const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:users:info';
const idGen = require('uuid62');

describe('eg users info', () => {
  let program, env, userId, username;

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });
  after(() => adminHelper.stop());

  beforeEach(() => {
    env.prepareHijack();
    username = idGen.v4();

    return adminHelper.admin.users.create({
      username: username,
      firstname: 'La',
      lastname: 'Deeda'
    })
      .then(user => {
        userId = user.id;
      });
  });

  afterEach(() => {
    env.resetHijack();
  });

  it('returns user info', done => {
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
        const user = JSON.parse(output);

        assert.equal(user.firstname, 'La');
        assert.equal(user.lastname, 'Deeda');
        assert(user.isActive);

        assert.equal(error, null);

        done();
      });
    });

    env.argv = program.parse('users info ' + username);
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
        assert.equal(output, userId);
        assert.equal(error, null);

        done();
      });
    });

    env.argv = program.parse('users info ' + username + ' -q');
  });
});
