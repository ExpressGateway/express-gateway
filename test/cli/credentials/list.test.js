const assert = require('assert');
const idGen = require('uuid-base62');
const adminHelper = require('../../common/admin-helper')();
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:credentials:list';

describe('eg credentials list -c ', () => {
  let program, env, username;

  const createdTypes = {
    inc (type, isActive) {
      if (isActive) {
        this.active[type] = (this.active[type] || 0) + 1;
      } else {
        this.archive[type] = (this.archive[type] || 0) + 1;
      }
      this.all[type] = (this.all[type] || 0) + 1;
    },
    reset () {
      this.active = {};
      this.archive = {};
      this.all = {};
    }
  };

  const createdKeyAuthKeys = {
    add (keyId, isActive) {
      if (isActive) {
        this.active.push(keyId);
      } else {
        this.archive.push(keyId);
      }
      this.all.push(keyId);
    },
    reset () {
      this.active = [];
      this.archive = [];
      this.all = [];
    }
  };

  const createCredential = (type, options = {}, isActive = true) => {
    const { credentials } = adminHelper.admin;
    return credentials
      .create(username, type, options)
      .then((credential) => {
        const promises = [];
        createdTypes.inc(type, isActive);

        switch (type) {
          case 'key-auth':
            const { keyId } = credential;
            createdKeyAuthKeys.add(keyId, isActive);
            if (!isActive) {
              promises.push(credentials.deactivate(keyId, type));
            }
            break;
        }

        return Promise.all(promises);
      });
  };

  before(() => {
    ({ program, env } = environment.bootstrap());
    return adminHelper.start();
  });

  after(() => adminHelper.stop());

  beforeEach(() => {
    createdTypes.reset();
    createdKeyAuthKeys.reset();

    env.prepareHijack();

    return adminHelper
      .reset()
      .then(() => {
        return adminHelper
          .admin
          .users
          .create({
            username: idGen.v4(),
            firstname: 'La',
            lastname: 'Deeda'
          })
          .then(user => {
            username = user.username;
            return Promise.all([
              createCredential('key-auth'),
              createCredential('basic-auth', { password: 'test1' }),
              createCredential('oauth2', { secret: 'eg1' }),
              createCredential('key-auth', {}, false),
              createCredential('key-auth', {}, false),
              createCredential('key-auth', {}, false)
            ]);
          });
      });
  });

  it('should show active credentials', done => {
    const types = {};
    const keyAuthKeys = [];
    env.hijack(namespace, generator => {
      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = msg => {
          const crd = JSON.parse(msg);
          types[crd.type] = (types[crd.type] || 0) + 1;
          if (crd.type === 'key-auth') {
            keyAuthKeys.push(crd.keyId);
          }
        };
      });

      generator.once('end', () => {
        keyAuthKeys.sort();
        createdKeyAuthKeys.all.sort();

        assert.deepEqual(types, createdTypes.active);
        assert.deepEqual(keyAuthKeys, createdKeyAuthKeys.active);
        done();
      });
    });

    env.argv = program.parse(`credentials list -c ${username}`);
  });

  it('should show all archived credentials', done => {
    const types = {};
    const keyAuthKeys = [];
    env.hijack(namespace, generator => {
      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = msg => {
          const crd = JSON.parse(msg);
          types[crd.type] = (types[crd.type] || 0) + 1;
          if (crd.type === 'key-auth') {
            keyAuthKeys.push(crd.keyId);
          }
        };
      });

      generator.once('end', () => {
        keyAuthKeys.sort();
        createdKeyAuthKeys.archive.sort();

        assert.deepEqual(types, createdTypes.archive);
        assert.deepEqual(keyAuthKeys, createdKeyAuthKeys.archive);
        done();
      });
    });

    env.argv = program.parse(`credentials list -f archived -c ${username}`);
  });

  it('should show all active and archive credentials', done => {
    const types = {};
    const keyAuthKeys = [];
    env.hijack(namespace, generator => {
      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = msg => {
          const crd = JSON.parse(msg);
          types[crd.type] = (types[crd.type] || 0) + 1;
          if (crd.type === 'key-auth') {
            keyAuthKeys.push(crd.keyId);
          }
        };
      });

      generator.once('end', () => {
        keyAuthKeys.sort();
        createdKeyAuthKeys.all.sort();

        assert.deepEqual(types, createdTypes.all);
        assert.deepEqual(keyAuthKeys, createdKeyAuthKeys.all);
        done();
      });
    });

    env.argv = program.parse(`credentials list -f archived active -c ${username}`);
  });
});
