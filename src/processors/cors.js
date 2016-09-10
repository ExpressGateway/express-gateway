'use strict';

const cors = require('cors');

function createCorsMiddleware(params) {
  return cors(params);
}

module.exports = {
  cors: createCorsMiddleware
};
