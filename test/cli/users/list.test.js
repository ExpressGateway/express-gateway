const assert = require('assert');
const adminHelper = require('../../common/admin-helper')();
const idGen = require('uuid-base62');
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:users:list';
const superagent = require('superagent');
const sinon = require('sinon');

describe('eg users list', () => {
  let program, env, user1, user2;

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
    }).then(user => {
      user1 = user;
      return adminHelper.admin.users.create({
        username: idGen.v4(),
        firstname: 'La',
        lastname: 'Deeda'
      });
    }).then(user => {
      user2 = user;
    });
  });

  afterEach(() => {
    env.resetHijack();
    return adminHelper.reset();
  });

  it('should show users list', done => {
    env.hijack(namespace, generator => {
      let output = {};

      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = message => {
          let usr = JSON.parse(message);
          output[usr.username] = true;
        };
      });

      generator.once('end', () => {
        assert.ok(output[user1.username]);
        assert.ok(output[user2.username]);
        done();
      });
    });

    env.argv = program.parse('users list ');
  });

  // For now output is the same as without -q, just to check that flag is accepted
  it('prints only the usernames when using the --quiet flag', done => {
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
        assert.ok(output[user1.username]);
        assert.ok(output[user2.username]);
        done();
      });
    });

    env.argv = program.parse('users list --quiet ');
  });

  describe('when passing -H flag', () => {
    before('set spy', () => {
      sinon.spy(superagent.Request.prototype, 'set');
    });
    after('restore', () => {
      superagent.Request.prototype.set.restore();
    });
    it('should send header', done => {
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
          let args = superagent.Request.prototype.set.lastCall.args;
          // .set('X','Y') (headerName,value)
          assert.equal(args[0], 'X');
          assert.equal(args[1], 'Y');
          assert.ok(output[user1.username]);
          assert.ok(output[user2.username]);
          done();
        });
      });

      env.argv = program.parse('users list -H "X:Y" -q');
    });
    it('should send multi headers', done => {
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
          assert.ok(superagent.Request.prototype.set.calledWithMatch(sinon.match('X'), sinon.match('Y')));
          assert.ok(superagent.Request.prototype.set.calledWithMatch(sinon.match('A'), sinon.match('B')));
          assert.ok(output[user1.username]);
          assert.ok(output[user2.username]);
          done();
        });
      });

      env.argv = program.parse('users list -H "X:Y" -H "A:B" -q');
    });
  });
});
