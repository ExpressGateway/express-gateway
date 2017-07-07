let request = require('superagent');
module.exports = function (sdkConfig) {
  let host = sdkConfig.hostname || 'localhost';
  let port = sdkConfig.port || 9876;
  let baseUrl = `http://${host}:${port}/scopes/`;
  return {
    create (scope) {
      return request
        .post(baseUrl)
        .send({ scope })
        .then(res => res.body);
    },
    remove (scope) {
      return request
        .del(baseUrl + scope)
        .then(res => res.body);
    },
    info (scope) {
      request
        .get(baseUrl + scope)
        .then(res => res.body);
    },
    list () {
      request
        .get(baseUrl)
        .then(res => res.body);
    }

  };
};
