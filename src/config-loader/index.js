const express = require('express');
const serverLoader = require('./server-loader');
const fileLoader = require('./file-loader');
const pipelineLoader = require('./pipelines-loader');

function loadConfig(fileName) {
  let config = fileLoader.readConfigFile(fileName);
  let app = express();

  pipelineLoader.bootstrap(app, config);

  let servers = serverLoader.bootstrap(app, config)

  //TODO: as part of #13 refactor to return both server and run at the same time
  return [servers.httpsServer || servers.httpServer, config];
}

module.exports = {
  loadConfig
};