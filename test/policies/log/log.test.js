const logAction = require('../../../lib/actions/log').log;
const {EgContextBase} = require('../../../lib/gateway/context');
const logger = require('../../../lib/log').logPolicy;
const sinon = require('sinon');
const assert = require('assert');

describe('logging policy', () => {
  let res = {
    test: 'text'
  };
  let req = {
    url: '/test',
    method: 'GET',
    egContext: Object.create(new EgContextBase())
  };
  req.egContext.req = req;
  req.egContext.res = res;
  before('prepare mocks', () => {
    sinon.spy(logger, 'info');
    sinon.spy(logger, 'error');
  });
  it('should log url', () => {
    let next = sinon.spy();
    let logMiddleware = logAction({
      // eslint-disable-next-line no-template-curly-in-string
      message: '${req.url} ${egContext.req.method} ${res.test}'
    });

    logMiddleware(req, {}, next);
    assert.equal(logger.info.getCall(0).args[0], '/test GET text');
    assert.ok(next.calledOnce);
  });
  it('should fail to access global context', () => {
    let next = sinon.spy();
    let logMiddleware = logAction({
      // eslint-disable-next-line no-template-curly-in-string
      message: '${process.exit(1)}'
    });
    logMiddleware(req, res, next);
    assert.ok(logger.info.notCalled);

    assert.ok(logger.error.getCall(0).args[0].indexOf('failed to build log message') >= 0);
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
