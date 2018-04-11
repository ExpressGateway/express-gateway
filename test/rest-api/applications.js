const should = require('should');
const idGen = require('uuid62');
const adminHelper = require('../common/admin-helper')();

describe('REST: Applications', () => {
  before(() => adminHelper.start({
    config: {
      gatewayConfig: {
        admin: { port: 0 },
        pipelines: null
      }
    }
  }));
  afterEach(() => adminHelper.reset());
  after(() => adminHelper.stop());

  const username = idGen.v4();

  describe('Insert two applications with the same name under the same user', () => {
    before(() => adminHelper.admin.users.create({
      username,
      firstname: 'La',
      lastname: 'Deeda'
    }).then(() => {
      return adminHelper.admin.apps.create(username, {
        name: 'appy1',
        redirectUri: 'http://localhost:3000/cb'
      });
    }));

    it('should return an error on the second attemp', () => {
      return should(adminHelper.admin.apps.create(username, {
        name: 'appy1',
        redirectUri: 'http://localhost:3000/cb'
      })).be.rejected();
    });
  });

  describe('Get an application by name', () => {
    before(() => adminHelper.admin.users.create({
      username,
      firstname: 'La',
      lastname: 'Deeda'
    }).then(() => {
      return adminHelper.admin.apps.create(username, {
        name: 'appy1',
        redirectUri: 'http://localhost:3000/cb'
      });
    }));

    it('should return the app if looking for it by name', () => {
      return should(adminHelper.admin.apps.info('appy1').then((app) => {
        should(app).have.property('name');
        should(app.name).be.equal('appy1');
      })).be.fulfilled();
    });
  });

  describe('Use start and count parameters', () => {
    before(() => Promise.all(Array(100).map(i => adminHelper.admin.apps.create({ username, name: idGen.v4() }))));

    it('should return a numeric value for nextKey', () =>
      adminHelper.admin.apps.list().then((data) => should(data).have.property('nextKey').Number())
    );
  });
});
