const express = require('express');
const serverLoader = require('./server-loader');
const fileLoader = require('./file-loader');
const pipelineLoader = require('./pipelines-loader');
const fs = require('fs');
let logger = require('../log').config;

function loadConfig(fileName) {
  let config = fileLoader.readConfigFile(fileName);
  let app = express();
  let rootRouter = pipelineLoader.bootstrap(express.Router(), config);

  app.use((req, res, next) => {
    // rootRouter will process all requests;
    // after hot swap old instance will continue to serve previous requests
    // new instance will be serving new requests
    // once all old requests are served old instance is target for GC
    rootRouter(req, res, next);
  });

  fs.watch(fileName, (evt, name) => {
    logger.info(`watch file triggered ${evt} file ${name}
      note: loading file ${fileName}`);
    let config = fileLoader.readConfigFile(fileName);
    //hot swap router
    rootRouter = pipelineLoader.bootstrap(express.Router(), config);
  });

  let servers = serverLoader.bootstrap(app, config)

  //TODO: as part of #13 refactor to return both server and run at the same time
  return [servers.httpsServer || servers.httpServer, config];
}

module.exports = {
  loadConfig
};