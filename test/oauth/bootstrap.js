const express = require('express');
const config = require('../../lib/config');
const oauth2 = require('../../lib/policies/oauth2/oauth2-routes');
require('../../lib/policies/oauth2/oauth2');
require('../../lib/policies/basic-auth/basic-auth');

const app = express();
module.exports = oauth2(app, config);
