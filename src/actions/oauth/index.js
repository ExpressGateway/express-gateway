let passport = require('passport'),
    oauth2 = require('./oauth-server');

module.exports = function(app) { // it'll also have a params arg
  app.use(passport.initialize());
  require('./auth');

  app.get('/oauth2/authorize', oauth2.authorization);
  app.post('/oauth2/authorize/decision', oauth2.decision);
  app.post('/oauth2/token', oauth2.token);

  return app;
}
