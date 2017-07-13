const path = require('path');

process.env.EG_CONFIG_DIR = path.join(__dirname, 'config');

const startGateway = require('express-gateway/lib/gateway');
const startAdminAPI = require('express-gateway/lib/rest');

startGateway();
startAdminAPI();
