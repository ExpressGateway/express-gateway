const url = require('url');

module.exports = class RoundRobin {
  constructor (proxyOptions, endpoints) {
    this.proxyOptions = proxyOptions;
    this.endpoints = endpoints;
  }

  nextTarget () {
    const target = this.endpoints[0];
    return url.parse(target);
  }
};
