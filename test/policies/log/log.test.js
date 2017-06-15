const logAction = require('../../../src/actions/log').log;
const logger = require('../../../src/log').logPolicy;
const sinon = require('sinon');
const assert = require('assert');

describe('logging policy', () => {
  before('prepare mocks', () => {
    sinon.spy(logger, 'info');
    sinon.spy(logger, 'error');
  });
  it('should log url', () => {
    let next = sinon.spy();
    let logMiddleware = logAction({
      // eslint-disable-next-line no-template-curly-in-string
      message: '${url} ${method}'
    });
    logMiddleware({ url: '/test', method: 'GET' }, {}, next);
    assert.equal(logger.info.getCall(0).args[0], '/test GET');
    assert.ok(next.calledOnce);
  });
  it('should fail to access global context', () => {
    let next = sinon.spy();
    let logMiddleware = logAction({
      // eslint-disable-next-line no-template-curly-in-string
      message: '${process.exit(1)}'
    });
    logMiddleware({ url: '/test', method: 'GET' }, {}, next);
    assert.ok(logger.info.notCalled);

    assert.equal(logger.error.getCall(0).args[0], 'failed to build log message; process is not defined');
    assert.ok(next.calledOnce);
  });

  afterEach(function () {
    logger.info.reset();
    logger.error.reset();
  });

  after(function () {
    logger.info.restore();
    logger.error.restore();
  });
});
