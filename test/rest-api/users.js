const should = require('should');
const adminHelper = require('../common/admin-helper')();

describe('REST: Users', () => {
  before(() =>
    adminHelper.start({
      config: {
        gatewayConfig: {
          admin: { port: 0 },
          pipelines: null
        }
      }
    }));

  after(() => adminHelper.stop());

  describe('Pagination features', () => {
    before(() => Promise.all(Array(100).fill().map((e, index) => adminHelper.admin.users.create({ username: index, firstname: 'Clark', lastname: 'Kent' }))));

    it('should return a numeric value for nextKey', () =>
      adminHelper.admin.users.list().then((data) => should(data).have.property('nextKey').Number().not.eql(0))
    );

    it('should respect the start parameter', () =>
      adminHelper.admin.users.list({ start: 20 }).then((data) => should(data.users[0].username).not.eql('1'))
    );

    it('should respect a count parameter', () =>
      adminHelper.admin.users.list({ count: 40 }).then((data) => should(data.users.length).lessThanOrEqual(40))
    );
  });
});
