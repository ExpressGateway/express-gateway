'use strict';

const fs = require('fs');
const express = require('express');

const ConfigurationError = require('../errors').ConfigurationError;

const serverLoader = require('./server-loader');
const pipelineLoader = require('./pipelines-loader');

function loadConfig(fileName) {
  let config = readJsonFile(fileName);
  let app = express();

  pipelineLoader.bootstrap(app, config);

  let servers = serverLoader.bootstrap(app, config)

  //TODO: as part of #13 refactor to return both server and run at the same time
  return [servers.httpsServer || servers.httpServer, config];
}

function readJsonFile(fileName) {
  if (fs.existsSync(fileName)) {
    try {
      return JSON.parse(fs.readFileSync(fileName));
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new ConfigurationError(`Bad config file format: ${err}`);
      } else if ('errno' in err) {
        throw new ConfigurationError(`Could not read config file: ${err}`);
      }
      throw err;
    }
  } else {
    throw new ConfigurationError(`Could not find config file ${fileName}`);
  }
}

module.exports = {
  loadConfig
};