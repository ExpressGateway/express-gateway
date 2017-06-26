'use strict';

let mock = require('mock-require');
mock('redis', require('fakeredis'));

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
let config = require('../../lib/config');

let oauth = require('../../lib/oauth2');
let app = express();

app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session(config.systemConfig.session));
app.use(passport.initialize());
app.use(passport.session());

module.exports = oauth(app);
