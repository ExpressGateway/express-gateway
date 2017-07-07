'use strict';

const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const site = require('./site');
const oauth2Server = require('./oauth2-server');

module.exports = function (app, config) {
  app.use(cookieParser());
  app.use(session(config.systemConfig.session));
  app.use(passport.initialize());
  app.use(passport.session());

  app.set('view engine', 'ejs');

  app.get('/login', site.loginForm);
  app.post('/login', site.login);
  app.get('/logout', site.logout);

  app.get('/oauth2/authorize', oauth2Server.authorization);
  app.post('/oauth2/authorize/decision', oauth2Server.decision);
  app.post('/oauth2/token', oauth2Server.token);

  return app;
};
