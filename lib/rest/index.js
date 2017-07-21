let logger = require('../logger').admin;
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

module.exports = function () {
  let cfg = require('../config').gatewayConfig;

  if (!cfg.admin || !cfg.admin.port) return;
  cfg.admin.hostname = cfg.admin.hostname || 'localhost';
  let express = require('express');
  let app = express();
  let bodyParser = require('body-parser');

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use((req, res, next) => {
    logger.debug(req.url, req.method);
    req.body && logger.debug(req.body);
    next();
  });
  app.use('/users', require('./routes/users')());
  app.use('/apps', require('./routes/apps')());
  app.use('/scopes', require('./routes/scopes')());
  app.use('/credentials', require('./routes/credentials')());
  app.use('/tokens', require('./routes/tokens')());

  const spec = fs.readFileSync(path.join(__dirname, './swagger-doc.yaml'));
  const swaggerDocument = yaml.load(spec);
  swaggerDocument.host = cfg.admin.hostname + ':' + cfg.admin.port;
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use((err, req, res, next) => {
    logger.debug(err.stack);
    res.status(500).send(err.message || 'admin API error');
  });
  return new Promise(resolve => {
    let srv = app.listen(cfg.admin.port, cfg.admin.hostname, cfg.admin.backlog, () => {
      const { address, port } = srv.address();
      // eslint-disable-next-line no-console
      console.log(`admin http server listening on ${address}:${port}`);
      resolve(srv);
    });
  });
};
