const vm = require('vm');
module.exports = {
  EgContextBase
};

function EgContextBase () {}

EgContextBase.prototype.evaluateAsTemplateString = function (expression) {
  return this.run('`' + expression + '`', this);
};
EgContextBase.prototype.match = function (expression) {
  return !!this.run(expression, this);
  // TODO: now it is Specifically converting to bool, but it may be needed to extend to support
  // strings like 'yes', 'true',
};
EgContextBase.prototype.run = function (code) {
  return vm.runInNewContext(code, { egContext: this, req: this.req, res: this.res });
};
