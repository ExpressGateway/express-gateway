let logger = require('../log').admin;
module.exports = function () {
  let cfg = require('../config').gatewayConfig;

  if (!cfg.admin || !cfg.admin.port) return;

  let express = require('express');        // call express
  let app = express();                 // define our app using express
  let bodyParser = require('body-parser');

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.use('/users', require('./routes/users')());
  app.use('/apps', require('./routes/apps')());

  app.use((err, req, res, next) => {
    logger.debug(err.stack);
    res.status(500).send(err.message || 'admin API error');
  });
  app.listen(cfg.admin.port, cfg.admin.host || 'localhost', cfg.admin.backlog || 511, () => {
    logger.info('listening ', cfg.admin);
  });
};
