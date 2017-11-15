const assert = require('assert');
const PassThrough = require('stream').PassThrough;
const helpers = require('yeoman-test');
const adminHelper = require('../../common/admin-helper')();
const idGen = require('uuid-base62');
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:credentials:create';

describe('eg credentials create', () => {
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
    return env.resetHijack();
  });

  it('creates a credential from prompts', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let text = null;

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

        helpers.mockPrompt(generator, {});
      });

      generator.once('end', () => {
        const loggedCred = JSON.parse(output);
        assert.equal(text, 'Created ' + loggedCred.keyId);

        return adminHelper.admin.credentials.info(loggedCred.keyId, 'key-auth')
          .then(cred => {
            assert.ok(cred.keyId);
            assert.ok(cred.keySecret);
            assert.ok(cred.isActive);
            assert.equal(cred.consumerId, user.id);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse('credentials create -t key-auth -c ' + user.username);
  });

  it('creates a credential from prompts and allows keyId and keySectet to be set', done => {
    env.hijack(namespace, generator => {
      let output = null;
      let text = null;

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

        helpers.mockPrompt(generator, {});
      });

      generator.once('end', () => {
        const loggedCred = JSON.parse(output);
        assert.equal(text, 'Created ' + loggedCred.keyId);

        return adminHelper.admin.credentials.info(loggedCred.keyId, 'key-auth')
          .then(cred => {
            assert.equal(cred.keyId, '888');
            assert.equal(cred.keySecret, '999');
            assert.ok(cred.isActive);
            assert.equal(cred.consumerId, user.id);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse('credentials create -p "keyId=888" -p "keySecret=999" -t key-auth -c ' + user.username);
  });

  it('creates a credential for user from stdin', done => {
    const cmd = { consumer: user.username, type: 'key-auth', keyId: '777', keySecret: '666' };

    env.hijack(namespace, generator => {
      let output = null;
      let text = null;
      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          output = message;
        };

        generator.log.ok = message => {
          text = message;
        };

        generator.stdin = new PassThrough();
        generator.stdin.write(JSON.stringify(cmd), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        const loggedCred = JSON.parse(output);
        assert.equal(text, 'Created ' + loggedCred.keyId);
        return adminHelper.admin.credentials.info(loggedCred.keyId, 'key-auth')
          .then(cred => {
            assert.equal(cred.keyId, cmd.keyId);
            assert.equal(cred.keySecret, cmd.keySecret);
            assert.ok(cred.isActive);
            assert.equal(cred.consumerId, user.id);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse('credentials create --stdin');
  });

  it('creates a credential for user from stdin and allows set keyId and keySecret', done => {
    const cmd = { consumer: user.username, type: 'key-auth' };

    env.hijack(namespace, generator => {
      let output = null;
      let text = null;
      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          output = message;
        };

        generator.log.ok = message => {
          text = message;
        };

        generator.stdin = new PassThrough();
        generator.stdin.write(JSON.stringify(cmd), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        const loggedCred = JSON.parse(output);
        assert.equal(text, 'Created ' + loggedCred.keyId);
        return adminHelper.admin.credentials.info(loggedCred.keyId, 'key-auth')
          .then(cred => {
            assert.ok(cred.keyId);
            assert.ok(cred.keySecret);
            assert.ok(cred.isActive);
            assert.equal(cred.consumerId, user.id);
            done();
          }).catch(done);
      });
    });

    env.argv = program.parse('credentials create --stdin');
  });

  it('prints only the API key id when using the --quiet flag', done => {
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
        const loggedCred = output.split(':')[0];
        return adminHelper.admin.credentials.info(loggedCred, 'key-auth')
          .then(cred => {
            assert.ok(cred.keyId);
            assert.ok(cred.keySecret);
            assert.ok(cred.isActive);
            assert.equal(cred.consumerId, user.id);
            assert.equal(output, cred.keyId + ':' + cred.keySecret);

            done();
          }).catch(done);
      });
    });

    env.argv = program.parse('credentials create -t key-auth -c ' + user.username + ' -q');
  });

  it('prints error on invalid username from stdin', done => {
    const credential = {};

    env.hijack(namespace, generator => {
      let output = null;
      let error = null;

      generator.once('run', () => {
        generator.log = message => {
          output = message;
        };
        generator.log.error = message => {
          error = message;
        };
        generator.log.ok = message => {
          output = message;
        };

        generator.stdin = new PassThrough();
        generator.stdin.write(JSON.stringify(credential), 'utf8');
        generator.stdin.end();
      });

      generator.once('end', () => {
        assert.equal(error, 'invalid username');
        assert.equal(output, null);
        done();
      });
    });

    env.argv = program.parse('credentials create --stdin');
  });
});
