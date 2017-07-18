const path = require('path');
const gateway = require('express-gateway');

gateway()
  .load(path.join(__dirname, 'config'))
  .run();
