'use strict';

const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const site = require('./site');
const oauth2Server = require('./oauth2-server');

module.exports = function (app, config) {
  app.set('view engine', 'ejs');

  const middlewares = [
    bodyParser.urlencoded({ extended: true }),
    bodyParser.json(),
    session(config.systemConfig.session),
    passport.initialize(),
    passport.session()
  ];
  app.get('/login', site.loginForm);
  app.post('/login', middlewares, site.login);
  app.get('/logout', site.logout);

  app.use('/oauth2', middlewares);
  app.get('/oauth2/authorize', oauth2Server.authorization);
  app.post('/oauth2/authorize/decision', oauth2Server.decision);
  app.post('/oauth2/token', oauth2Server.token);

  return app;
};
