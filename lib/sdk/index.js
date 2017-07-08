// TODO: this is EG admin SDK; should be separated git\npm
module.exports = function (sdkConfig) {
  let host = sdkConfig.hostname || 'localhost';
  let port = sdkConfig.port || 9876;
  sdkConfig.baseUrl = sdkConfig.baseUrl || `http://${host}:${port}/`;
  return {
    users: require('./users')(sdkConfig),
    apps: require('./apps')(sdkConfig),
    scopes: require('./scopes')(sdkConfig),
    credentials: require('./credentials')(sdkConfig)
  };
};
