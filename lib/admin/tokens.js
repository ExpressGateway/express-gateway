let request = require('superagent');
module.exports = function (adminConfig) {
  let baseUrl = adminConfig.baseUrl + `tokens/`;
  return {
    revoke (token) {
      return request
        .del(baseUrl + token)
        .then(res => res.body);
    }
  };
};
