const path = require('path');
const gateway = require('@sansitech/express-gateway');

gateway()
  .load(path.join(__dirname, 'config'))
  .run();
