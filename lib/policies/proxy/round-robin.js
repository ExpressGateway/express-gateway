const logger = require('../../logger').gateway;

module.exports = class RoundRobin {
  constructor (proxy, endpoints) {
    this._proxy = proxy;

    this.endpoints = endpoints;
    this.endpointIndex = 0;
    this.endpointMaxIndex = this.endpoints.length - 1;
  }

  proxy (req, res) {
    const options = {
      target: this.nextTarget()
    };

    logger.debug(`proxying to ${options.target}, ${req.method} ${req.url}`);
    return this._proxy.web(req, res, options);
  }

  nextTarget () {
    const target = this.endpoints[this.endpointIndex++];

    if (this.endpointIndex > this.endpointMaxIndex) {
      this.endpointIndex = 0;
    }

    return target;
  }
};
