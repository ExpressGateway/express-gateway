const url = require('url');
const logger = require('../../logger').gateway;

module.exports = class RoundRobin {
  constructor (proxy, proxyOptions, endpoints) {
    this._proxy = proxy;

    this.proxyOptions = proxyOptions;
    this.endpoints = endpoints;
    this.endpointIndex = 0;
    this.endpointMaxIndex = this.endpoints.length - 1;
  }

  proxy (req, res) {
    const nextTarget = this.nextTarget();
    const parsedEndpointUrl = url.parse(nextTarget);

    this.proxyOptions.target = Object.assign(this.proxyOptions.target, parsedEndpointUrl);

    logger.debug(`proxying to ${nextTarget}, ${req.method} ${req.url}`);
    return this._proxy.web(req, res, this.proxyOptions);
  }

  nextTarget () {
    const target = this.endpoints[this.endpointIndex++];

    if (this.endpointIndex > this.endpointMaxIndex) {
      this.endpointIndex = 0;
    }

    return target;
  }
};
