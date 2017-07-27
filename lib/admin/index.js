// TODO: this is EG admin client; internal utility
module.exports = function ({cliConfig, headers, verbose}) {
  let host = cliConfig.hostname || 'localhost';
  let port = cliConfig.port || 9876;
  let protocol = cliConfig.protocol || 'http';
  let baseUrl = cliConfig.baseUrl || `${protocol}://${host}:${port}/`;
  let client = require('./client')({baseUrl, verbose, headers});
  return {
    users: require('./users')(client),
    apps: require('./apps')(client),
    scopes: require('./scopes')(client),
    credentials: require('./credentials')(client),
    tokens: require('./tokens')(client)
  };
};
