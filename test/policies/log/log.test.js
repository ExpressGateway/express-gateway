const logAction = require('../../../src/actions/log').log
const logger = require('../../../src/log').logPolicy;
const sinon = require('sinon')
const assert = require('assert')

describe('logging policy', () => {
  before('prepare mocks', () => {
    sinon.spy(logger, 'info');
  })
  it('should log url', () => {
    let next = sinon.spy();
    let logMiddleware = logAction({
      message: '${url} ${method}'
    })
    logMiddleware({ url: '/test', method: 'GET' }, {}, next)
    assert.equal(logger.info.getCall(0).args[0], '/test GET')
    assert.ok(next.calledOnce)
  })
  it('should fail to access global context', () => {
    let next = sinon.spy();
    let logMiddleware = logAction({
      message: '${process.exit(1)}'
    })
    assert.throws(() => logMiddleware({ url: '/test', method: 'GET' }, {}, next))
  })


  after('restore logger', () => {
    logger.info.restore();
  })
})