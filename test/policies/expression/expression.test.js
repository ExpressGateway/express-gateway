const expressionAction = require('../../../src/actions/expression').expression;
const {EgContextBase} = require('../../../src/gateway/context');
const assert = require('assert');

describe('expression action', () => {
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
  it('should execute code against eg context', (done) => {
    let expressionMiddleware = expressionAction({
      jscode: 'req.url = req.url + "/67" ; res.test = res.test + 68;'
    });

    expressionMiddleware(req, res, () => {
      assert.equal(req.url, '/test/67');
      assert.equal(res.test, 'text68');
      done();
    });
  });
});
