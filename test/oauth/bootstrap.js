'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');

let oauth = require('../../src/plugins/oauth2');
let app = express();

app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false })); // TODO: add session options to config file
app.use(passport.initialize());
app.use(passport.session());

module.exports = oauth(app);
