'use strict';

const session = require('express-session');
const express = require('express');
const passport = require('passport');
const site = require('./site');
const oauth2Server = require('./oauth2-server');
const logger = require('../../logger').policy;

module.exports = function (app, config) {
  app.set('view engine', 'ejs');
  if (config.systemConfig.session.storeProvider) {
    try {
      const ProviderStore = require(config.systemConfig.session.storeProvider)(session);
      config.systemConfig.session.store = new ProviderStore(config.systemConfig.session.storeOptions);
      delete config.systemConfig.session.storeProvider;
      delete config.systemConfig.session.storeOptions;
    } catch (error) {
      logger.error(`Failed to initialize custom express-session store, please ensure you have ${config.systemConfig.session.storeProvider} npm package installed`);
      throw error;
    }
  }

  const middlewares = [
    express.urlencoded({ extended: true }),
    express.json(),
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
