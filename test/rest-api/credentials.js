const should = require('should');
const adminHelper = require('../common/admin-helper')();

describe('REST: Credentials', () => {
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

  describe('Insert test', () => {
    it('should not insert a credential when the consumer does not exist', () =>
      should(adminHelper.admin.credentials.create('IDoNotExist', 'key-auth', {}))
        .be.rejectedWith({ response: { error: { text: 'No consumer found with id: IDoNotExist' } } })
    );
  });
});
