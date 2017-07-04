// TODO: this is EG admin SDK; should be separated git\npm
module.exports = function (sdkConfig) {
  return {
    users: require('./users')(sdkConfig),
    apps: require('./apps')(sdkConfig),
    scopes: require('./scopes')(sdkConfig)
  };
};
