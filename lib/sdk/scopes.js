let request = require('superagent');
module.exports = function (sdkConfig) {
  let host = sdkConfig.hostname || 'localhost';
  let port = sdkConfig.port || 9876;
  let baseUrl = `http://${host}:${port}/scopes`;
  return {};
};
