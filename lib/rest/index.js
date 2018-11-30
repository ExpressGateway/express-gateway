const logger = require('../logger').admin;
const eventBus = require('../eventBus');
const express = require('express');

module.exports = function ({ plugins, config } = {}) {
  const cfg = (config || require('../config')).gatewayConfig;

  if (!cfg.admin || cfg.admin.port === undefined || cfg.admin.port === null) {
    logger.verbose('Admin server is not configured, launch canceled');
    return;
  }
  cfg.admin.hostname = cfg.admin.hostname || 'localhost';

  const app = express();
  app.set('x-powered-by', false);

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use((req, res, next) => {
    logger.debug(`${req.url} ${req.method}`);
    req.body && logger.debug(req.body);
    next();
  });
  if (plugins && plugins.adminRoutes && plugins.adminRoutes.length) {
    plugins.adminRoutes.forEach(ext => ext(app));
  }
  app.use('/users', require('./routes/users')());
  app.use('/apps', require('./routes/apps')());
  app.use('/scopes', require('./routes/scopes')());
  app.use('/credentials', require('./routes/credentials')());
  app.use('/tokens', require('./routes/tokens')());
  app.use('/api-endpoints', require('./routes/api-endpoints')({ config }));
  app.use('/service-endpoints', require('./routes/service-endpoints')({ config }));
  app.use('/pipelines', require('./routes/pipelines')({ config }));
  app.use('/policies', require('./routes/policies')({ config }));
  app.use('/schemas', require('./routes/schemas')());

  app.use((err, req, res, next) => {
    logger.debug(err.stack);
    if (err.code === 'INVALID_CONFIG') {
      return res.status(422).send(err.message);
    }
    res.status(500).send(err.message || 'admin API error');
  });

  if (process.argv.indexOf('--experimental-plugins-api') > -1) {
    app.use('/plugins', require('./routes/plugins')());
  }

  return new Promise(resolve => {
    const srv = app.listen(cfg.admin.port, cfg.admin.hostname, cfg.admin.backlog, () => {
      const { address, port } = srv.address();
      logger.info(`admin http server listening on ${address}:${port}`);
      eventBus.emit('admin-ready', { adminServer: srv });
      resolve(srv);
    });
  });
};
