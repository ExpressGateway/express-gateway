'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const errorHandler = require('errorhandler');
const session = require('express-session');
const passport = require('passport');
const site = require('./site');
const oauth2 = require('./oauth2');
const user = require('./user');
const client = require('./client');

// Express configuration
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(errorHandler());
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
require('./auth');

app.get('/', site.index);
app.get('/login', site.loginForm);
app.post('/login', site.login);
app.get('/logout', site.logout);
app.get('/account', site.account);

app.get('/oauth2/authorize', oauth2.authorization);
app.post('/oauth2/authorize/decision', oauth2.decision);
app.post('/oauth2/token', oauth2.token);

app.get('/api/userinfo', user.info);
app.get('/api/clientinfo', client.info);

module.exports = app;

//app.listen(process.env.PORT || 3000);
