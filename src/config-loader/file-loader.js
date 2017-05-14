const fs = require('fs')
const ConfigurationError = require('../errors').ConfigurationError
const yaml = require('js-yaml')
const debug = require('debug')('gateway:config');

module.exports.readConfigFile = function(fileName) {
  if (!fs.existsSync(fileName)) {
    throw new ConfigurationError(`Could not find config file ${fileName}`);
  }

  try {
    let fileContent = fs.readFileSync(fileName);
    return yaml.load(fileContent); // valid JSON or YAML format
  } catch (err) {
    if (err instanceof yaml.YAMLException) {
      debug(`Bad config file format: ${err}`);
    }
    throw err;
  }
}