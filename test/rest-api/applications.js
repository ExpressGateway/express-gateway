const should = require('should');
const idGen = require('uuid62');
const adminHelper = require('../common/admin-helper')();
const username = idGen.v4();

describe('REST: Applications', () => {
  before(() =>
    adminHelper.start({
      config: {
        gatewayConfig: {
          admin: { port: 0 },
          pipelines: null
        }
      }
    }).then(() => adminHelper.admin.users.create({ username, firstname: 'La', lastname: 'Deeda' })));

  after(() => adminHelper.stop());

  describe('Insert two applications with the same name under the same user', () => {
    before(() =>
      adminHelper.admin.apps.create(username, { name: 'appy1', redirectUri: 'http://localhost:3000/cb' })
    );

    it('should return an error on the second attemp', () =>
      should(adminHelper.admin.apps.create(username, {
        name: 'appy1',
        redirectUri: 'http://localhost:3000/cb'
      })).be.rejected()
    );
  });

  describe('Get an application by name', () => {
    it('should return the app if looking for it by name', () =>
      adminHelper.admin.apps.info('appy1').then((app) => {
        should(app).have.property('name');
        should(app.name).be.equal('appy1');
      })
    );
  });

  describe('Pagination features', () => {
    before(() => Promise.all(Array(100).fill().map((e, index) => adminHelper.admin.apps.create(username, { name: index }))));

    it('should return a numeric value for nextKey', () =>
      adminHelper.admin.apps.list().then((data) => should(data).have.property('nextKey').Number().not.eql(0))
    );

    it('should respect the start parameter', () =>
      adminHelper.admin.apps.list({ start: 20 }).then((data) => should(data.apps[0].name).not.eql('appy1'))
    );

    it('should respect a count parameter', () =>
      adminHelper.admin.apps.list({ count: 3 }).then((data) => should(data.apps.length).lessThanOrEqual(3))
    );
  });
});
