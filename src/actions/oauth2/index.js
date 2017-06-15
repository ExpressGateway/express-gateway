'use strict';

const site = require('./site');
const oauth2 = require('./oauth2');

module.exports = function (app) {
  app.set('view engine', 'ejs');
  require('./auth');

  app.get('/login', site.loginForm);
  app.post('/login', site.login);
  app.get('/logout', site.logout);

  app.get('/oauth2/authorize', oauth2.authorization);
  app.post('/oauth2/authorize/decision', oauth2.decision);
  app.post('/oauth2/token', oauth2.token);

  return app;
};
