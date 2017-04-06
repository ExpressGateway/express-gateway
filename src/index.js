'use strict';

let gateway = require('./gateway');

if (require.main === module) {
  gateway.start({
    configPath: process.argv[2] || '/etc/lunchbadger/gateway.conf',
    defaultBindPort: 8080,
    defaultBindHost: '127.0.0.1'
  });
}
