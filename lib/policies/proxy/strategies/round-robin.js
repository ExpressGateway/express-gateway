const url = require('url');

module.exports = class RoundRobin {
  constructor (proxyOptions, endpoints) {
    this.proxyOptions = proxyOptions;
    this.endpoints = endpoints;
    this.endpointIndex = 0;
    this.endpointMaxIndex = this.endpoints.length - 1;
  }

  nextTarget () {
    const target = this.endpoints[this.endpointIndex++];

    if (this.endpointIndex > this.endpointMaxIndex) {
      this.endpointIndex = 0;
    }

    return Object.assign({}, this.proxyOptions.target, url.parse(target));
  }
};
