const url = require('url');

module.exports = class StaticProxy {
  constructor (proxyOptions, endpoints) {
    this.proxyOptions = proxyOptions;
    this.endpoints = endpoints;
    this.target = this.endpoints[0];
  }

  nextTarget () {
    return url.parse(target);
  }
};
