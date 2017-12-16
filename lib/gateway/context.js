const vm = require('vm');

const uuid62 = require('uuid62');
function EgContextBase () {
  this.requestID = uuid62.v4();
}
Object.defineProperty(EgContextBase.prototype, 'egContext', {
  get () {
    return this;
  }
});

Object.defineProperty(EgContextBase.prototype, 'consumer', {
  get () {
    return this.req.user;
  }
});

EgContextBase.prototype.evaluateAsTemplateString = function (expression) {
  return this.run('`' + expression + '`', this);
};
EgContextBase.prototype.match = function (expression) {
  return !!this.run(expression, this);
  // TODO: now it is Specifically converting to bool, but it may be needed to extend to support
  // strings like 'yes', 'true',
};
EgContextBase.prototype.run = function (code, ctx) {
  // Note: It must be some standard object like `this`
  // Do not construct new object each time
  // In that case it will have to build new contextified object
  // So subsequent calls will take longer time then agains some already contextified object
  return vm.runInNewContext(code, ctx || this);
};

module.exports = EgContextBase;
