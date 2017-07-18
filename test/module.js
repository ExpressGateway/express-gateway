const assert = require('assert');
const path = require('path');
const gateway = require('../lib');

describe('main module', () => {
  it('fires up a new gateway instance with valid config', () => {
    gateway()
      .load(path.join(__dirname, 'config'))
      .run();

    // this require needs to happen after the gateway is running.
    const config = require('../lib/config');

    assert(!!config.gatewayConfig);
    assert(!!config.systemConfig);
  });
});
