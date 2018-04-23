const should = require('should');
const idGen = require('uuid62');
const adminHelper = require('../../common/admin-helper')();
const environment = require('../../fixtures/cli/environment');
const namespace = 'express-gateway:credentials:list';

describe('eg credentials list -c ', () => {
  let program, env, username;

  const createdTypes = {
    inc (cred, type, isActive) {
      if (isActive) {
        this.active[type] = (this.active[type] || 0) + 1;
      } else {
        this.archive[type] = (this.archive[type] || 0) + 1;
      }
      this.all[type] = (this.all[type] || 0) + 1;
      this.raw.push(cred);
    },
    reset () {
      this.active = {};
      this.archive = {};
      this.all = {};
      this.raw = [];
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

  const createCredential = (username, type, options = {}, isActive = true) => {
    return adminHelper.admin.credentials
      .create(username, type, options)
      .then((credential) => {
        createdTypes.inc(credential, type, isActive);

        if (type === 'key-auth') {
          createdKeyAuthKeys.add(credential.id, isActive);
        }

        if (!isActive) {
          return adminHelper.admin.credentials.deactivate(credential.id, type);
        }
      });
  };

  before(() => {
    createdTypes.reset();
    createdKeyAuthKeys.reset();

    return adminHelper
      .start()
      .then(() => adminHelper.admin.users.create({
        username: idGen.v4(),
        firstname: 'La',
        lastname: 'Deeda'
      }))
      .then(user => {
        username = user.username;
        return Promise.all([
          createCredential(user.username, 'key-auth'),
          createCredential(user.username, 'basic-auth', { password: 'test1' }),
          createCredential(user.username, 'oauth2', { secret: 'eg1' }),
          createCredential(user.username, 'key-auth', {}, false),
          createCredential(user.username, 'key-auth', {}, false),
          createCredential(user.username, 'key-auth', {}, false)
        ]);
      })
      .then(() => adminHelper.admin.users.create({
        username: idGen.v4(),
        firstname: 'Clark',
        lastname: 'Kent'
      }))
      .then(user =>
        adminHelper.admin.credentials.create(user.username, 'key-auth', {})
      );
  });

  after(() => adminHelper.stop());

  beforeEach(() => {
    ({ program, env } = environment.bootstrap());
    env.prepareHijack();
  });

  afterEach(() => {
    env.resetHijack();
  });

  it('should have the id property, but not the secret ones', () => {
    createdTypes.raw.forEach(cred => {
      should(cred).not.have.properties('secret', 'password');
      should(cred).have.property('id');
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

        should(types).deepEqual(createdTypes.active);
        should(keyAuthKeys).deepEqual(createdKeyAuthKeys.active);
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

        should(types).deepEqual(createdTypes.archive);
        should(keyAuthKeys).deepEqual(createdKeyAuthKeys.archive);
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

        should(types).deepEqual(createdTypes.all);
        should(keyAuthKeys).deepEqual(createdKeyAuthKeys.all);
        done();
      });
    });

    env.argv = program.parse(`credentials list -f archived active -c ${username}`);
  });

  it('should show all credentials if consumer is not provided', done => {
    const types = {};
    env.hijack(namespace, generator => {
      generator.once('run', () => {
        generator.log.error = message => {
          done(new Error(message));
        };
        generator.stdout = msg => {
          const crd = JSON.parse(msg);
          types[crd.type] = (types[crd.type] || 0) + 1;
        };
      });

      generator.once('end', () => {
        should(types).have.property('key-auth', 5);
        done();
      });
    });

    env.argv = program.parse(`credentials list`);
  });
});
