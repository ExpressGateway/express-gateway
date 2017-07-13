let logger = require('../logger').admin;
module.exports = function () {
  let cfg = require('../config').gatewayConfig;

  if (!cfg.admin || !cfg.admin.port) return;

  let express = require('express');
  let app = express();
  let bodyParser = require('body-parser');

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use((req, res, next) => {
    logger.debug(req.url, req.method);
    next();
  });
  app.use('/users', require('./routes/users')());
  app.use('/apps', require('./routes/apps')());
  app.use('/scopes', require('./routes/scopes')());
  app.use('/credentials', require('./routes/credentials')());
  app.use('/tokens', require('./routes/tokens')());

  app.use((err, req, res, next) => {
    logger.debug(err.stack);
    res.status(500).send(err.message || 'admin API error');
  });
  return new Promise(resolve => {
    let srv = app.listen(cfg.admin.port, cfg.admin.hostname || 'localhost', cfg.admin.backlog, () => {
      logger.info('listening ', srv.address());
      resolve(srv);
    });
  });
};
