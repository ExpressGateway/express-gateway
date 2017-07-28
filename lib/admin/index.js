// TODO: this is EG admin client; internal utility
module.exports = function ({cliConfig, headers, verbose}) {
  let baseUrl = process.env.EG_ADMIN_URL || cliConfig.url || `http://localhost:9876/`;

  let client = require('./client')({baseUrl, verbose, headers});
  return {
    users: require('./users')(client),
    apps: require('./apps')(client),
    scopes: require('./scopes')(client),
    credentials: require('./credentials')(client),
    tokens: require('./tokens')(client)
  };
};
