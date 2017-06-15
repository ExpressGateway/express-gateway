const fs = require('fs');
const ConfigurationError = require('../errors').ConfigurationError;
const yaml = require('js-yaml');
const logger = require('../log').config;

module.exports.readConfigFile = function (fileName) {
  if (!fs.existsSync(fileName)) {
    throw new ConfigurationError(`Could not find config file ${fileName}`);
  }

  try {
    let fileContent = fs.readFileSync(fileName);
    return yaml.load(fileContent); // valid JSON or YAML format
  } catch (err) {
    if (err instanceof yaml.YAMLException) {
      logger.error(`Bad config file format: ${err}`);
    }
    throw err;
  }
};
