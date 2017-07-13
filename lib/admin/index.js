// TODO: this is EG admin client; internal utility
module.exports = function (adminConfig) {
  let host = adminConfig.hostname || 'localhost';
  let port = adminConfig.port || 9876;
  adminConfig.baseUrl = adminConfig.baseUrl || `http://${host}:${port}/`;
  return {
    users: require('./users')(adminConfig),
    apps: require('./apps')(adminConfig),
    scopes: require('./scopes')(adminConfig),
    credentials: require('./credentials')(adminConfig),
    tokens: require('./tokens')(adminConfig)
  };
};
