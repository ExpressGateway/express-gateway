'use strict';

const express = require('express');
let config = require('../../lib/config');

let oauth2 = require('../../lib/policies/oauth2/oauth2-routes');
let app = express();

module.exports = oauth2(app, config);
