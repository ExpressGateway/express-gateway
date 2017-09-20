// TODO: this is EG admin client; internal utility
module.exports = function (options) {
  const client = require('./client')(options);

  return {
    users: require('./users')(client),
    apps: require('./apps')(client),
    scopes: require('./scopes')(client),
    credentials: require('./credentials')(client),
    tokens: require('./tokens')(client),
    config: {
      policies: require('./config/policies')(client)
    }
  };
};
